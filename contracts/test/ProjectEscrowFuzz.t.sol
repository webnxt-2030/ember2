// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../src/ProjectEscrow.sol";
import "../src/PositionNFT.sol";

// ─── Minimal USDT mock with 6 decimals ───────────────────────────────────────
contract FuzzMockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

// ─── Fuzz test contract ───────────────────────────────────────────────────────
contract ProjectEscrowFuzzTest is Test {
    string  constant BASE_URI      = "https://app.ember.example/api/nft/";
    uint32  constant VOTING_PERIOD = 7 days;
    address constant ORG_WALLET    = address(0xABCD);

    // Helper: deploy escrow + NFT with given bps, wire them together
    function _deploy(uint16[] memory bps)
        internal
        returns (FuzzMockUSDT usdt, ProjectEscrow escrow)
    {
        usdt = new FuzzMockUSDT();
        PositionNFT nft = new PositionNFT(BASE_URI);
        escrow = new ProjectEscrow(
            address(usdt),
            address(nft),
            ORG_WALLET,
            bps,
            VOTING_PERIOD
        );
        nft.initEscrow(address(escrow));
    }

    // Helper: fund and contribute
    function _contribute(FuzzMockUSDT usdt, ProjectEscrow escrow, address who, uint256 amount) internal {
        usdt.mint(who, amount);
        vm.prank(who);
        usdt.approve(address(escrow), amount);
        vm.prank(who);
        escrow.contribute(amount);
    }

    // ─── Fuzz 1: Random contribute amount, fixed 4-milestone LINEAR escrow ──
    // sum(allocated[1..3]) + m0Released <= totalContributed (integer rounding)
    function test_fuzz_contribute_InvariantHolds(uint96 amount) public {
        amount = uint96(bound(uint256(amount), 1e6, 1_000_000e6));

        uint16[] memory bps = new uint16[](4);
        bps[0] = 2500; bps[1] = 2500; bps[2] = 2500; bps[3] = 2500;
        (FuzzMockUSDT usdt, ProjectEscrow escrow) = _deploy(bps);

        address backer = address(0x1234);
        _contribute(usdt, escrow, backer, uint256(amount));

        // Compute m0Released
        uint256 m0Released = uint256(amount) * bps[0] / 10000;

        // Sum allocations for milestones 1..3
        uint256 allocSum = 0;
        for (uint256 i = 1; i < 4; ++i) {
            allocSum += escrow.milestoneAllocated(i);
        }

        uint256 total = escrow.totalContributed();

        // Invariant: allocSum + m0Released <= totalContributed
        // (using <= to allow for integer dust from truncation)
        assertLe(
            allocSum + m0Released,
            total,
            "Fuzz1: allocSum + m0Released should not exceed totalContributed"
        );

        // Dust should be very small (< number of milestones)
        assertLe(
            total - (allocSum + m0Released),
            uint256(bps.length),
            "Fuzz1: dust should be at most milestoneBps.length - 1"
        );
    }

    // ─── Fuzz 2: Multiple contributions, invariant holds cumulatively ────────
    function test_fuzz_multipleContributions_InvariantHolds(
        uint96[5] calldata amounts
    ) public {
        uint16[] memory bps = new uint16[](4);
        bps[0] = 2500; bps[1] = 2500; bps[2] = 2500; bps[3] = 2500;
        (FuzzMockUSDT usdt, ProjectEscrow escrow) = _deploy(bps);

        uint256 m0Released = 0;
        for (uint256 j = 0; j < 5; j++) {
            uint256 amt = bound(uint256(amounts[j]), 1e6, 100_000e6);
            address backer = address(uint160(0x1000 + j));
            _contribute(usdt, escrow, backer, amt);
            m0Released += amt * bps[0] / 10000;
        }

        // Sum allocations for milestones 1..3
        uint256 allocSum = 0;
        for (uint256 i = 1; i < 4; ++i) {
            allocSum += escrow.milestoneAllocated(i);
        }

        uint256 total = escrow.totalContributed();

        // Invariant: allocSum + m0Released <= totalContributed
        assertLe(
            allocSum + m0Released,
            total,
            "Fuzz2: allocSum + m0Released should not exceed totalContributed"
        );

        // Dust is at most (number of contributions) * (number of milestones - 1)
        assertLe(
            total - (allocSum + m0Released),
            5 * uint256(bps.length),
            "Fuzz2: dust should be bounded"
        );
    }

    // ─── Fuzz 3: Random milestone bps (valid config), random contribution ────
    // Construct valid 4-milestone bps summing to 10000.
    // Use first 3 as given (clamped), last = 10000 - sum(first 3).
    function test_fuzz_randomBps_InvariantHolds(
        uint16[3] calldata bps_,
        uint96 amount
    ) public {
        // Clamp each of the first 3 bps to [0, 3332] so last bps stays valid
        uint16 b0 = uint16(bound(uint256(bps_[0]), 0, 3332));
        uint16 b1 = uint16(bound(uint256(bps_[1]), 0, 3332));
        uint16 b2 = uint16(bound(uint256(bps_[2]), 0, 3332));

        uint256 sumFirst3 = uint256(b0) + uint256(b1) + uint256(b2);
        // Remaining goes to last milestone
        uint256 last = 10000 - sumFirst3;
        // last must be >= 0, and all milestones must total exactly 10000
        // Since sumFirst3 <= 9996, last >= 4; valid
        vm.assume(last <= 10000);

        uint16[] memory bps = new uint16[](4);
        bps[0] = b0;
        bps[1] = b1;
        bps[2] = b2;
        bps[3] = uint16(last);

        // Verify bps sum (defensive)
        uint256 bpsSum = uint256(b0) + uint256(b1) + uint256(b2) + last;
        vm.assume(bpsSum == 10000);

        (FuzzMockUSDT usdt, ProjectEscrow escrow) = _deploy(bps);

        uint256 amt = bound(uint256(amount), 1e6, 1_000_000e6);
        address backer = address(0x4242);
        _contribute(usdt, escrow, backer, amt);

        // Compute m0Released
        uint256 m0Released = amt * bps[0] / 10000;

        // Sum allocations for milestones 1..3
        uint256 allocSum = 0;
        for (uint256 i = 1; i < 4; ++i) {
            allocSum += escrow.milestoneAllocated(i);
        }

        uint256 total = escrow.totalContributed();

        // Invariant: allocSum + m0Released <= totalContributed
        assertLe(
            allocSum + m0Released,
            total,
            "Fuzz3: allocSum + m0Released should not exceed totalContributed"
        );

        // Dust is at most number of milestones - 1
        assertLe(
            total - (allocSum + m0Released),
            uint256(bps.length),
            "Fuzz3: dust should be at most milestoneBps.length - 1"
        );
    }

    // ─── Fuzz 4: zero m0 bps path (m0Share == 0) ─────────────────────────────
    // Verify the m0Share == 0 branch: no USDT transferred to org at contribute time.
    function test_fuzz_zeroM0Bps_InvariantHolds(uint96 amount) public {
        uint256 amt = bound(uint256(amount), 1e6, 1_000_000e6);

        // bps[0] = 0, milestones 1-3 split the rest
        uint16[] memory bps = new uint16[](4);
        bps[0] = 0; bps[1] = 3334; bps[2] = 3333; bps[3] = 3333;

        (FuzzMockUSDT usdt, ProjectEscrow escrow) = _deploy(bps);

        address backer = address(0x5555);
        _contribute(usdt, escrow, backer, amt);

        // m0Share is 0 so org wallet should have received 0
        assertEq(usdt.balanceOf(ORG_WALLET), 0, "Fuzz4: org wallet should receive 0 when m0 bps == 0");

        // Escrow holds all of `amt` (minus rounding dust)
        uint256 allocSum = 0;
        for (uint256 i = 1; i < 4; ++i) {
            allocSum += escrow.milestoneAllocated(i);
        }

        uint256 total = escrow.totalContributed();
        assertLe(allocSum, total, "Fuzz4: allocSum should not exceed totalContributed");
    }
}
