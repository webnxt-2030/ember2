// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../src/ProjectEscrow.sol";
import "../src/PositionNFT.sol";

// ─── Minimal USDT mock with 6 decimals ───────────────────────────────────────
contract InvariantMockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

// ─── Handler: actions callable by Foundry's invariant engine ─────────────────
contract EscrowHandler is Test {
    ProjectEscrow    public escrow;
    InvariantMockUSDT public token;
    address          public orgWallet;

    // Ghost variables tracking totals computed off-chain
    uint256 public m0Released;    // total m0 auto-released to org
    uint256 public totalClaimed;  // total claimed by org via claimMilestone

    // Track backers
    address[] internal _backers;
    mapping(address => bool) internal _isBacker;

    // Track milestones that have been submitted/resolved
    uint256 internal _numMilestones;

    uint32  constant VOTING_PERIOD = 7 days;
    string  constant UPDATE_URI    = "ipfs://QmInvariantTest";

    constructor(
        ProjectEscrow escrow_,
        InvariantMockUSDT token_,
        address orgWallet_,
        uint256 numMilestones_
    ) {
        escrow        = escrow_;
        token         = token_;
        orgWallet     = orgWallet_;
        _numMilestones = numMilestones_;
    }

    // ─── Action: contribute ──────────────────────────────────────────────────
    function contribute(uint96 rawAmount) public {
        uint256 amount = bound(uint256(rawAmount), 1e6, 100_000e6);

        address backer = address(uint160(uint256(keccak256(abi.encodePacked(msg.sender, amount)))));
        if (!_isBacker[backer]) {
            _backers.push(backer);
            _isBacker[backer] = true;
        }

        token.mint(backer, amount);
        vm.prank(backer);
        token.approve(address(escrow), amount);
        vm.prank(backer);
        escrow.contribute(amount);

        // Track m0 released: amount * bps[0] / 10000
        // We read it from the contract via milestoneBps[0]
        uint256 m0Bps = escrow.milestoneBps(0);
        m0Released += amount * m0Bps / 10000;
    }

    // ─── Action: submitAndPassMilestone ─────────────────────────────────────
    // Submits a milestone and immediately warps past the voting window so it passes.
    function submitAndPassMilestone(uint8 rawIndex) public {
        if (escrow.totalContributed() == 0) return; // nothing to do yet

        // Clamp to valid range (milestones 1..n-1)
        uint256 n = _numMilestones;
        uint256 idx = bound(uint256(rawIndex), 1, n - 1);

        ProjectEscrow.Status status = escrow.milestoneStatus(idx);
        // Only submit from PENDING or FAILED states
        if (
            status == ProjectEscrow.Status.VOTING ||
            status == ProjectEscrow.Status.PASSED  ||
            status == ProjectEscrow.Status.CLAIMED
        ) return;

        vm.prank(orgWallet);
        escrow.submitMilestone(idx, UPDATE_URI);

        // Warp past voting window so no one can vote against
        vm.warp(block.timestamp + VOTING_PERIOD + 1);

        // Resolve: passes because no NO votes
        escrow.resolveMilestone(idx);
    }

    // ─── Action: claimMilestone ──────────────────────────────────────────────
    function claimMilestone(uint8 rawIndex) public {
        uint256 n = _numMilestones;
        uint256 idx = bound(uint256(rawIndex), 1, n - 1);

        if (escrow.milestoneStatus(idx) != ProjectEscrow.Status.PASSED) return;

        uint256 allocated = escrow.milestoneAllocated(idx);

        vm.prank(orgWallet);
        escrow.claimMilestone(idx);

        totalClaimed += allocated;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────
    function backerCount() external view returns (uint256) {
        return _backers.length;
    }
}

// ─── Invariant test ───────────────────────────────────────────────────────────
contract ProjectEscrowInvariantTest is Test {
    EscrowHandler handler;
    ProjectEscrow escrow;

    address constant ORG_WALLET = address(0xABCD);
    string  constant BASE_URI   = "https://app.ember.example/api/nft/";
    uint32  constant VOTING_PERIOD = 7 days;

    function setUp() public {
        // 4 equal linear milestones [2500, 2500, 2500, 2500]
        uint16[] memory bps = new uint16[](4);
        bps[0] = 2500; bps[1] = 2500; bps[2] = 2500; bps[3] = 2500;

        InvariantMockUSDT token = new InvariantMockUSDT();
        PositionNFT nft         = new PositionNFT(BASE_URI);
        escrow                  = new ProjectEscrow(
            address(token),
            address(nft),
            ORG_WALLET,
            bps,
            VOTING_PERIOD
        );
        nft.initEscrow(address(escrow));

        handler = new EscrowHandler(escrow, token, ORG_WALLET, 4);

        // Foundry invariant: only call handler methods
        targetContract(address(handler));
    }

    // ─── Invariant: sum(allocated[i>=1]) + m0Released + totalClaimed <= totalContributed
    // The <= allows for integer rounding dust. The difference should never be
    // negative (which would indicate funds are being created from nothing).
    function invariant_totalAccountingHolds() public view {
        uint256 total = escrow.totalContributed();
        uint256 n     = 4; // number of milestones

        uint256 allocSum = 0;
        for (uint256 i = 1; i < n; ++i) {
            allocSum += escrow.milestoneAllocated(i);
        }

        uint256 accountedFor = allocSum + handler.m0Released() + handler.totalClaimed();

        assertLe(
            accountedFor,
            total,
            "Invariant violated: more funds accounted for than totalContributed"
        );
    }

    // ─── Invariant: m0 milestone always has status AUTO_RELEASED and zero allocation
    function invariant_m0AlwaysAutoReleased() public view {
        assertEq(
            uint256(escrow.milestoneStatus(0)),
            uint256(ProjectEscrow.Status.AUTO_RELEASED),
            "Invariant: m0 status must always be AUTO_RELEASED"
        );
        assertEq(
            escrow.milestoneAllocated(0),
            0,
            "Invariant: m0 allocated must always be 0"
        );
    }

    // ─── Invariant: escrow USDT balance >= sum(allocated[i>=1])
    // Funds in escrow must cover all outstanding allocations
    function invariant_escrowBalanceCovorsAllocations() public view {
        uint256 n = 4;
        uint256 allocSum = 0;
        for (uint256 i = 1; i < n; ++i) {
            allocSum += escrow.milestoneAllocated(i);
        }

        uint256 escrowBalance = IERC20(address(escrow.usdt())).balanceOf(address(escrow));

        assertGe(
            escrowBalance,
            allocSum,
            "Invariant: escrow balance must cover all outstanding allocations"
        );
    }
}
