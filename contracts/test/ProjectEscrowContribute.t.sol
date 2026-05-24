// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../src/ProjectEscrow.sol";
import "../src/PositionNFT.sol";

// ─── Minimal USDT mock with 6 decimals ───────────────────────────────────────
contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

// ─── Test contract ────────────────────────────────────────────────────────────
contract ProjectEscrowContributeTest is Test {
    MockUSDT      usdt;
    PositionNFT   nft;
    ProjectEscrow escrow;

    address orgWallet = address(0xABCD);
    address backer    = address(0x1234);
    address backer2   = address(0x5678);

    string  constant BASE_URI     = "https://app.ember.example/api/nft/";
    uint32  constant VOTING_PERIOD = 7 days;

    // Helper: deploy escrow + NFT with given bps, wire them together
    function _deployWithBps(uint16[] memory bps) internal {
        usdt   = new MockUSDT();
        nft    = new PositionNFT(BASE_URI);
        escrow = new ProjectEscrow(
            address(usdt),
            address(nft),
            orgWallet,
            bps,
            VOTING_PERIOD
        );
        nft.initEscrow(address(escrow));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // test_contribute_AutoReleasesMilestoneZero
    //
    // 4 LINEAR milestones [2500, 2500, 2500, 2500].
    // Contribute 1000 USDT (1000e6 with 6 decimals).
    // Verify m0 auto-release and per-milestone allocations.
    // ──────────────────────────────────────────────────────────────────────────
    function test_contribute_AutoReleasesMilestoneZero() public {
        uint16[] memory bps = new uint16[](4);
        bps[0] = 2500; bps[1] = 2500; bps[2] = 2500; bps[3] = 2500;
        _deployWithBps(bps);

        uint256 amount   = 1000e6; // 1000 USDT
        uint256 m0Share  = 250e6;  // 25% of 1000

        // Fund backer and approve
        usdt.mint(backer, amount);
        vm.prank(backer);
        usdt.approve(address(escrow), amount);

        // Contribute
        vm.prank(backer);
        escrow.contribute(amount);

        // m0Share sent to org wallet
        assertEq(usdt.balanceOf(orgWallet), m0Share, "org wallet should receive m0Share");

        // m0 milestone state
        assertEq(escrow.milestoneAllocated(0), 0, "m0 allocated must be 0");
        assertEq(
            uint256(escrow.milestoneStatus(0)),
            uint256(ProjectEscrow.Status.AUTO_RELEASED),
            "m0 status must be AUTO_RELEASED"
        );

        // Milestones 1–3 each get 250 USDT allocated
        for (uint256 i = 1; i < 4; ++i) {
            assertEq(escrow.milestoneAllocated(i), 250e6, "milestone allocated mismatch");
        }

        // Global accounting
        assertEq(escrow.totalContributed(), amount, "totalContributed mismatch");
        assertEq(escrow.totalContributedBy(backer), amount, "totalContributedBy mismatch");

        // Escrow balance = contributed - m0Released = 1000 - 250 = 750
        assertEq(usdt.balanceOf(address(escrow)), 750e6, "escrow balance mismatch");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // test_contribute_MintsNftWithCorrectMetadata
    //
    // After contribute, backer holds tokenId 0 and positionOf returns correct data.
    // ──────────────────────────────────────────────────────────────────────────
    function test_contribute_MintsNftWithCorrectMetadata() public {
        uint16[] memory bps = new uint16[](4);
        bps[0] = 2500; bps[1] = 2500; bps[2] = 2500; bps[3] = 2500;
        _deployWithBps(bps);

        uint256 amount  = 1000e6;
        uint256 m0Share = 250e6;

        usdt.mint(backer, amount);
        vm.prank(backer);
        usdt.approve(address(escrow), amount);

        uint256 ts = block.timestamp;

        vm.prank(backer);
        escrow.contribute(amount);

        // Backer owns tokenId 0
        assertEq(nft.ownerOf(0), backer, "backer must own tokenId 0");

        // positionOf returns correct values
        (uint256 storedAmount, uint256 storedM0Share, uint64 contributedAt) = nft.positionOf(0);
        assertEq(storedAmount,  amount,          "nft amount mismatch");
        assertEq(storedM0Share, m0Share,          "nft m0Share mismatch");
        assertEq(contributedAt, uint64(ts),       "nft contributedAt mismatch");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // test_contribute_EmitsContributed
    //
    // vm.expectEmit verifies the Contributed event is emitted correctly.
    // ──────────────────────────────────────────────────────────────────────────
    function test_contribute_EmitsContributed() public {
        uint16[] memory bps = new uint16[](4);
        bps[0] = 2500; bps[1] = 2500; bps[2] = 2500; bps[3] = 2500;
        _deployWithBps(bps);

        uint256 amount  = 1000e6;
        uint256 m0Share = 250e6;
        uint256 tokenId = 0;

        usdt.mint(backer, amount);
        vm.prank(backer);
        usdt.approve(address(escrow), amount);

        // Expect Contributed(backer, 1000e6, 0, 250e6)
        vm.expectEmit(true, false, false, true, address(escrow));
        emit ProjectEscrow.Contributed(backer, amount, tokenId, m0Share);

        vm.prank(backer);
        escrow.contribute(amount);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // test_contribute_RevertsOnZeroAmount
    //
    // contribute(0) must revert with ZeroAmount.
    // ──────────────────────────────────────────────────────────────────────────
    function test_contribute_RevertsOnZeroAmount() public {
        uint16[] memory bps = new uint16[](4);
        bps[0] = 2500; bps[1] = 2500; bps[2] = 2500; bps[3] = 2500;
        _deployWithBps(bps);

        vm.prank(backer);
        vm.expectRevert(ProjectEscrow.ZeroAmount.selector);
        escrow.contribute(0);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // test_contribute_InvariantMilestoneSumEqualsTotal
    //
    // EXPONENTIAL-like bps [250, 375, 1125, 8250].
    // Multiple contributions; assert invariant: sum(allocated[i>=1]) + m0Released == totalContributed.
    // ──────────────────────────────────────────────────────────────────────────
    function test_contribute_InvariantMilestoneSumEqualsTotal() public {
        uint16[] memory bps = new uint16[](4);
        bps[0] = 250; bps[1] = 375; bps[2] = 1125; bps[3] = 8250;
        _deployWithBps(bps);

        uint256[] memory amounts = new uint256[](4);
        amounts[0] = 500e6;
        amounts[1] = 1000e6;
        amounts[2] = 333e6;
        amounts[3] = 2500e6;

        address[2] memory backers = [backer, backer2];

        // Fund and approve both backers
        uint256 fundAmount = 0;
        for (uint256 j = 0; j < amounts.length; j++) fundAmount += amounts[j];
        for (uint256 b = 0; b < 2; b++) {
            usdt.mint(backers[b], fundAmount);
            vm.prank(backers[b]);
            usdt.approve(address(escrow), fundAmount);
        }

        uint256 m0Released = 0;

        // Each backer makes all contributions
        for (uint256 b = 0; b < 2; b++) {
            for (uint256 j = 0; j < amounts.length; j++) {
                uint256 m0Share = amounts[j] * bps[0] / 10000;
                m0Released += m0Share;
                vm.prank(backers[b]);
                escrow.contribute(amounts[j]);
            }
        }

        // Sum allocations for milestones 1..N-1
        uint256 allocSum = 0;
        uint256 n = bps.length;
        for (uint256 i = 1; i < n; i++) {
            allocSum += escrow.milestoneAllocated(i);
        }

        uint256 total = escrow.totalContributed();

        // Invariant 1: sum(allocated[i>=1]) + m0Released == totalContributed
        assertEq(
            allocSum + m0Released,
            total,
            "Invariant 1 violated: allocSum + m0Released != totalContributed"
        );

        // Invariant 2: m0.allocated == 0, m0.status == AUTO_RELEASED
        assertEq(escrow.milestoneAllocated(0), 0, "Invariant 2a: m0 allocated must be 0");
        assertEq(
            uint256(escrow.milestoneStatus(0)),
            uint256(ProjectEscrow.Status.AUTO_RELEASED),
            "Invariant 2b: m0 status must be AUTO_RELEASED"
        );
    }
}
