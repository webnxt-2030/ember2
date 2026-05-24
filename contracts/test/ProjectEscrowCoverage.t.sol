// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ProjectEscrowCoverage
 * @notice Gap-filling tests to reach >= 90% branch coverage on ProjectEscrow
 *         and PositionNFT.
 *
 * Branches covered here (not covered in other test files):
 *
 * PositionNFT:
 *   - initEscrow: caller != _factory → revert OnlyEscrow
 *   - initEscrow: escrow already set → revert EscrowAlreadySet
 *
 * ProjectEscrow constructor:
 *   - milestoneBps.length < 2                → revert InvalidBps
 *   - milestoneBps.length > 20               → revert InvalidBps
 *   - sum(bps) != 10000                      → revert InvalidBps
 *
 * ProjectEscrow.contribute:
 *   - m0Share == 0 (bps[0] == 0)             → no transfer to org wallet
 *
 * ProjectEscrow.submitMilestone:
 *   - caller != organizationWallet           → revert OnlyOrg
 *   - milestoneIndex == 0                    → revert MilestoneM0
 *   - milestoneIndex >= milestoneBps.length  → revert MilestoneIndexOutOfBounds
 *   - status == VOTING                       → revert MilestoneAlreadyVoting
 *   - status == PASSED                       → revert MilestoneAlreadyVoting
 *   - status == CLAIMED                      → revert MilestoneAlreadyVoting
 *
 * ProjectEscrow.vote:
 *   - milestoneIndex == 0                    → revert MilestoneM0
 *   - vote with `yes = false`                → weightNo updated (else branch)
 *
 * ProjectEscrow.resolveMilestone:
 *   - milestoneIndex == 0                    → revert MilestoneM0
 *   - status != VOTING                       → revert MilestoneNotVoting
 *
 * ProjectEscrow.claimMilestone:
 *   - milestoneIndex == 0                    → revert MilestoneM0
 *   - milestoneIndex >= milestoneBps.length  → revert MilestoneIndexOutOfBounds
 */

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../src/ProjectEscrow.sol";
import "../src/PositionNFT.sol";

// ─── Minimal USDT mock with 6 decimals ───────────────────────────────────────
contract CoverageMockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

// ─── Coverage test contract ───────────────────────────────────────────────────
contract ProjectEscrowCoverageTest is Test {
    CoverageMockUSDT usdt;
    PositionNFT      nft;
    ProjectEscrow    escrow;

    address orgWallet  = address(0xABCD);
    address backer     = address(0x1234);
    address stranger   = address(0x9999);
    address notFactory = address(0xDEAD);

    string  constant BASE_URI      = "https://app.ember.example/api/nft/";
    uint32  constant VOTING_PERIOD = 7 days;
    string  constant UPDATE_URI    = "ipfs://QmCoverage";

    // Standard 4-milestone equal bps
    uint16[] bps4;

    function setUp() public {
        bps4 = new uint16[](4);
        bps4[0] = 2500; bps4[1] = 2500; bps4[2] = 2500; bps4[3] = 2500;

        usdt   = new CoverageMockUSDT();
        nft    = new PositionNFT(BASE_URI);
        escrow = new ProjectEscrow(
            address(usdt),
            address(nft),
            orgWallet,
            bps4,
            VOTING_PERIOD
        );
        nft.initEscrow(address(escrow));
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    function _fund(address who, uint256 amount) internal {
        usdt.mint(who, amount);
        vm.prank(who);
        usdt.approve(address(escrow), amount);
    }

    function _contribute(address who, uint256 amount) internal {
        _fund(who, amount);
        vm.prank(who);
        escrow.contribute(amount);
    }

    function _submitAndPass(uint256 milestoneIndex) internal {
        vm.prank(orgWallet);
        escrow.submitMilestone(milestoneIndex, UPDATE_URI);
        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        escrow.resolveMilestone(milestoneIndex);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  PositionNFT branch coverage
    // ═══════════════════════════════════════════════════════════════════════════

    // initEscrow: non-factory caller → revert OnlyEscrow
    function test_positionNFT_initEscrow_RevertsIfNotFactory() public {
        PositionNFT freshNft = new PositionNFT(BASE_URI);
        // `notFactory` is not the factory (which is address(this) here)
        vm.prank(notFactory);
        vm.expectRevert(PositionNFT.OnlyEscrow.selector);
        freshNft.initEscrow(address(escrow));
    }

    // initEscrow: second call (escrow already set) → revert EscrowAlreadySet
    function test_positionNFT_initEscrow_RevertsIfAlreadySet() public {
        // nft was already wired in setUp; try to wire it again from this contract
        // (address(this) is the factory here since this test contract deployed nft in setUp)
        // We need a fresh NFT deployed by THIS contract, so we can call initEscrow
        PositionNFT freshNft = new PositionNFT(BASE_URI);
        // First call succeeds
        freshNft.initEscrow(address(escrow));
        // Second call reverts
        vm.expectRevert(PositionNFT.EscrowAlreadySet.selector);
        freshNft.initEscrow(address(escrow));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  ProjectEscrow constructor branch coverage
    // ═══════════════════════════════════════════════════════════════════════════

    // constructor: milestoneBps.length < 2 → revert InvalidBps
    function test_constructor_RevertsIfBpsTooShort() public {
        uint16[] memory bps = new uint16[](1);
        bps[0] = 10000;
        PositionNFT freshNft = new PositionNFT(BASE_URI);
        vm.expectRevert(ProjectEscrow.InvalidBps.selector);
        new ProjectEscrow(address(usdt), address(freshNft), orgWallet, bps, VOTING_PERIOD);
    }

    // constructor: milestoneBps.length > 20 → revert InvalidBps
    function test_constructor_RevertsIfBpsTooLong() public {
        uint16[] memory bps = new uint16[](21);
        // sum won't be 10000 anyway, but length check fires first
        for (uint256 i; i < 21; ++i) bps[i] = 476;
        PositionNFT freshNft = new PositionNFT(BASE_URI);
        vm.expectRevert(ProjectEscrow.InvalidBps.selector);
        new ProjectEscrow(address(usdt), address(freshNft), orgWallet, bps, VOTING_PERIOD);
    }

    // constructor: sum(bps) != 10000 → revert InvalidBps
    function test_constructor_RevertsIfBpsSumInvalid() public {
        uint16[] memory bps = new uint16[](3);
        bps[0] = 3000; bps[1] = 3000; bps[2] = 3000; // sum = 9000
        PositionNFT freshNft = new PositionNFT(BASE_URI);
        vm.expectRevert(ProjectEscrow.InvalidBps.selector);
        new ProjectEscrow(address(usdt), address(freshNft), orgWallet, bps, VOTING_PERIOD);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  ProjectEscrow.contribute: m0Share == 0 branch
    // ═══════════════════════════════════════════════════════════════════════════

    // contribute: bps[0] == 0 → m0Share == 0 → no transfer to org wallet
    function test_contribute_ZeroM0Share_NoTransferToOrg() public {
        uint16[] memory bps = new uint16[](3);
        bps[0] = 0; bps[1] = 5000; bps[2] = 5000;

        CoverageMockUSDT freshUsdt = new CoverageMockUSDT();
        PositionNFT freshNft       = new PositionNFT(BASE_URI);
        ProjectEscrow freshEscrow  = new ProjectEscrow(
            address(freshUsdt),
            address(freshNft),
            orgWallet,
            bps,
            VOTING_PERIOD
        );
        freshNft.initEscrow(address(freshEscrow));

        uint256 amount = 1000e6;
        freshUsdt.mint(backer, amount);
        vm.prank(backer);
        freshUsdt.approve(address(freshEscrow), amount);
        vm.prank(backer);
        freshEscrow.contribute(amount);

        // org wallet receives nothing when m0 bps == 0
        assertEq(freshUsdt.balanceOf(orgWallet), 0, "org wallet should receive 0 when m0 bps == 0");
        // All amount stays in escrow
        assertEq(freshUsdt.balanceOf(address(freshEscrow)), amount, "all funds stay in escrow");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  ProjectEscrow.submitMilestone branch coverage
    // ═══════════════════════════════════════════════════════════════════════════

    // submitMilestone: non-org caller → revert OnlyOrg
    function test_submitMilestone_RevertsIfNotOrg() public {
        _contribute(backer, 1000e6);
        vm.prank(stranger);
        vm.expectRevert(ProjectEscrow.OnlyOrg.selector);
        escrow.submitMilestone(1, UPDATE_URI);
    }

    // submitMilestone: milestoneIndex == 0 → revert MilestoneM0
    function test_submitMilestone_RevertsIfIndexZero() public {
        _contribute(backer, 1000e6);
        vm.prank(orgWallet);
        vm.expectRevert(ProjectEscrow.MilestoneM0.selector);
        escrow.submitMilestone(0, UPDATE_URI);
    }

    // submitMilestone: milestoneIndex >= milestoneBps.length → revert MilestoneIndexOutOfBounds
    function test_submitMilestone_RevertsIfOutOfBounds() public {
        _contribute(backer, 1000e6);
        vm.prank(orgWallet);
        vm.expectRevert(ProjectEscrow.MilestoneIndexOutOfBounds.selector);
        escrow.submitMilestone(4, UPDATE_URI); // bps has 4 milestones (0..3)
    }

    // submitMilestone: status == VOTING → revert MilestoneAlreadyVoting
    function test_submitMilestone_RevertsIfAlreadyVoting() public {
        _contribute(backer, 1000e6);
        vm.prank(orgWallet);
        escrow.submitMilestone(1, UPDATE_URI);

        // status is now VOTING; submit again → revert
        vm.prank(orgWallet);
        vm.expectRevert(ProjectEscrow.MilestoneAlreadyVoting.selector);
        escrow.submitMilestone(1, UPDATE_URI);
    }

    // submitMilestone: status == PASSED → revert MilestoneAlreadyVoting
    function test_submitMilestone_RevertsIfPassed() public {
        _contribute(backer, 1000e6);
        _submitAndPass(1);

        assertEq(
            uint256(escrow.milestoneStatus(1)),
            uint256(ProjectEscrow.Status.PASSED),
            "precondition: milestone should be PASSED"
        );

        vm.prank(orgWallet);
        vm.expectRevert(ProjectEscrow.MilestoneAlreadyVoting.selector);
        escrow.submitMilestone(1, UPDATE_URI);
    }

    // submitMilestone: status == CLAIMED → revert MilestoneAlreadyVoting
    function test_submitMilestone_RevertsIfClaimed() public {
        _contribute(backer, 1000e6);
        _submitAndPass(1);

        vm.prank(orgWallet);
        escrow.claimMilestone(1);

        assertEq(
            uint256(escrow.milestoneStatus(1)),
            uint256(ProjectEscrow.Status.CLAIMED),
            "precondition: milestone should be CLAIMED"
        );

        vm.prank(orgWallet);
        vm.expectRevert(ProjectEscrow.MilestoneAlreadyVoting.selector);
        escrow.submitMilestone(1, UPDATE_URI);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  ProjectEscrow.vote branch coverage
    // ═══════════════════════════════════════════════════════════════════════════

    // vote: milestoneIndex == 0 → revert MilestoneM0
    function test_vote_RevertsIfIndexZero() public {
        _contribute(backer, 1000e6);
        vm.prank(backer);
        vm.expectRevert(ProjectEscrow.MilestoneM0.selector);
        escrow.vote(0, true);
    }

    // vote: yes == false → weightNo updated (else branch of `if (yes)`)
    function test_vote_NoVoteUpdatesWeightNo() public {
        _contribute(backer, 1000e6);
        vm.prank(orgWallet);
        escrow.submitMilestone(1, UPDATE_URI);

        vm.prank(backer);
        escrow.vote(1, false); // exercises the `else` branch

        // After voting NO, resolve → FAILED (weightNo * 2 >= totalContributed)
        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        escrow.resolveMilestone(1);

        assertEq(
            uint256(escrow.milestoneStatus(1)),
            uint256(ProjectEscrow.Status.FAILED),
            "milestone should FAIL after 100% NO vote"
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  ProjectEscrow.resolveMilestone branch coverage
    // ═══════════════════════════════════════════════════════════════════════════

    // resolveMilestone: milestoneIndex == 0 → revert MilestoneM0
    function test_resolveMilestone_RevertsIfIndexZero() public {
        vm.expectRevert(ProjectEscrow.MilestoneM0.selector);
        escrow.resolveMilestone(0);
    }

    // resolveMilestone: status != VOTING (PENDING) → revert MilestoneNotVoting
    function test_resolveMilestone_RevertsIfNotVoting() public {
        _contribute(backer, 1000e6);
        // milestone 1 is still PENDING (not submitted)
        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        vm.expectRevert(ProjectEscrow.MilestoneNotVoting.selector);
        escrow.resolveMilestone(1);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  ProjectEscrow.claimMilestone branch coverage
    // ═══════════════════════════════════════════════════════════════════════════

    // claimMilestone: milestoneIndex == 0 → revert MilestoneM0
    function test_claimMilestone_RevertsIfIndexZero() public {
        vm.prank(orgWallet);
        vm.expectRevert(ProjectEscrow.MilestoneM0.selector);
        escrow.claimMilestone(0);
    }

    // claimMilestone: milestoneIndex >= milestoneBps.length → revert MilestoneIndexOutOfBounds
    function test_claimMilestone_RevertsIfOutOfBounds() public {
        vm.prank(orgWallet);
        vm.expectRevert(ProjectEscrow.MilestoneIndexOutOfBounds.selector);
        escrow.claimMilestone(10); // way out of range
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  Additional view coverage
    // ═══════════════════════════════════════════════════════════════════════════

    // votingPowerOf: returns 0 for address that never contributed
    function test_votingPowerOf_ZeroForNonBacker() public view {
        assertEq(escrow.votingPowerOf(stranger), 0, "non-backer should have zero voting power");
    }

    // votingPowerOf: returns correct power after contribution
    function test_votingPowerOf_ReturnsContributionAmount() public {
        _contribute(backer, 500e6);
        assertEq(escrow.votingPowerOf(backer), 500e6, "voting power should equal contribution");
    }

    // Full end-to-end flow: contribute → submit → vote YES → resolve PASSED → claim
    function test_fullFlow_ContributeSubmitVotePassClaim() public {
        _contribute(backer, 1000e6);

        // Submit milestone 1
        vm.prank(orgWallet);
        escrow.submitMilestone(1, UPDATE_URI);

        // backer votes YES
        vm.prank(backer);
        escrow.vote(1, true);

        // Warp past voting window and resolve
        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        escrow.resolveMilestone(1);

        assertEq(
            uint256(escrow.milestoneStatus(1)),
            uint256(ProjectEscrow.Status.PASSED),
            "milestone should PASS after YES vote"
        );

        // Claim
        uint256 allocated = escrow.milestoneAllocated(1);
        vm.prank(orgWallet);
        escrow.claimMilestone(1);

        assertEq(escrow.milestoneAllocated(1), 0, "allocated should be 0 after claim");
        assertGt(usdt.balanceOf(orgWallet), 0, "org wallet should have received funds");
        // orgWallet also got m0 on contribute, so total balance = m0 + allocated
        uint256 m0 = 1000e6 * 2500 / 10000; // 250e6
        assertEq(usdt.balanceOf(orgWallet), m0 + allocated, "org wallet total balance mismatch");
    }
}
