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
contract ProjectEscrowClaimTest is Test {
    MockUSDT      usdt;
    PositionNFT   nft;
    ProjectEscrow escrow;

    address orgWallet = address(0xABCD);
    address backer    = address(0x1234);
    address stranger  = address(0x9999);

    string  constant BASE_URI      = "https://app.ember.example/api/nft/";
    uint32  constant VOTING_PERIOD = 7 days;
    string  constant UPDATE_URI    = "ipfs://QmTestClaim1";

    // 4 equal milestones: m0=25%, m1=25%, m2=25%, m3=25%
    uint16[] bps;

    function setUp() public {
        bps = new uint16[](4);
        bps[0] = 2500; bps[1] = 2500; bps[2] = 2500; bps[3] = 2500;

        usdt = new MockUSDT();

        address deployer = address(this);
        uint256 nonce    = vm.getNonce(deployer);

        // nft at nonce, escrow at nonce+1
        address futureEscrow = vm.computeCreateAddress(deployer, nonce + 1);

        nft    = new PositionNFT(futureEscrow, BASE_URI);
        escrow = new ProjectEscrow(
            address(usdt),
            address(nft),
            orgWallet,
            bps,
            VOTING_PERIOD
        );

        require(address(escrow) == futureEscrow, "escrow address mismatch");
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

    /// @dev Drive milestoneIndex from PENDING to PASSED.
    ///      No backer votes NO so abstain counts as YES → PASSED.
    function _reachPassed(uint256 milestoneIndex) internal {
        // 1. backer contributes 1000 USDT
        _contribute(backer, 1000e6);

        // 2. org submits milestone
        vm.prank(orgWallet);
        escrow.submitMilestone(milestoneIndex, UPDATE_URI);

        // 3. warp past voteEndAt (no one votes → abstain = YES)
        vm.warp(block.timestamp + VOTING_PERIOD + 1);

        // 4. resolve → PASSED
        escrow.resolveMilestone(milestoneIndex);

        assertEq(
            uint256(escrow.milestoneStatus(milestoneIndex)),
            uint256(ProjectEscrow.Status.PASSED),
            "_reachPassed: status should be PASSED"
        );
    }

    // ─── Tests ───────────────────────────────────────────────────────────────

    // 1. Full flow: contribute → submitMilestone → resolve → claimMilestone
    //    Verify: org received exactly allocated USDT, status=CLAIMED, allocated=0
    function test_claimMilestone_TransfersExactlyAllocatedAmount() public {
        _reachPassed(1);

        uint256 expectedAmount = escrow.milestoneAllocated(1);
        assertGt(expectedAmount, 0, "allocated should be non-zero before claim");

        uint256 orgBalanceBefore = usdt.balanceOf(orgWallet);

        vm.prank(orgWallet);
        escrow.claimMilestone(1);

        uint256 orgBalanceAfter = usdt.balanceOf(orgWallet);
        assertEq(
            orgBalanceAfter - orgBalanceBefore,
            expectedAmount,
            "org wallet should receive exactly allocated amount"
        );

        assertEq(
            uint256(escrow.milestoneStatus(1)),
            uint256(ProjectEscrow.Status.CLAIMED),
            "status should be CLAIMED after claim"
        );

        assertEq(
            escrow.milestoneAllocated(1),
            0,
            "allocated should be 0 after claim"
        );
    }

    // 2. Non-org caller reverts with OnlyOrg
    function test_claimMilestone_RevertsIfNotOrg() public {
        _reachPassed(1);

        vm.prank(stranger);
        vm.expectRevert(ProjectEscrow.OnlyOrg.selector);
        escrow.claimMilestone(1);
    }

    // 3. Claiming a PENDING milestone reverts with MilestoneNotPassed
    function test_claimMilestone_RevertsIfNotPassed() public {
        // Contribute so milestone 1 has non-zero allocated, but leave it PENDING
        _contribute(backer, 1000e6);

        vm.prank(orgWallet);
        vm.expectRevert(ProjectEscrow.MilestoneNotPassed.selector);
        escrow.claimMilestone(1);
    }

    // 4. Claiming an already CLAIMED milestone reverts with MilestoneNotPassed
    function test_claimMilestone_RevertsIfAlreadyClaimed() public {
        _reachPassed(1);

        // First claim succeeds
        vm.prank(orgWallet);
        escrow.claimMilestone(1);

        // Second claim reverts because status is now CLAIMED, not PASSED
        vm.prank(orgWallet);
        vm.expectRevert(ProjectEscrow.MilestoneNotPassed.selector);
        escrow.claimMilestone(1);
    }

    // 5. Claiming a FAILED milestone reverts with MilestoneNotPassed
    function test_claimMilestone_RevertsIfFailed() public {
        _contribute(backer, 1000e6);

        // Submit and vote 100% NO → FAILED
        vm.prank(orgWallet);
        escrow.submitMilestone(1, UPDATE_URI);

        vm.prank(backer);
        escrow.vote(1, false);

        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        escrow.resolveMilestone(1);

        assertEq(
            uint256(escrow.milestoneStatus(1)),
            uint256(ProjectEscrow.Status.FAILED),
            "status should be FAILED"
        );

        vm.prank(orgWallet);
        vm.expectRevert(ProjectEscrow.MilestoneNotPassed.selector);
        escrow.claimMilestone(1);
    }

    // 6. MilestoneClaimed event is emitted with correct milestoneIndex and amount
    function test_claimMilestone_EmitsMilestoneClaimed() public {
        _reachPassed(1);

        uint256 expectedAmount = escrow.milestoneAllocated(1);

        vm.expectEmit(true, false, false, true, address(escrow));
        emit ProjectEscrow.MilestoneClaimed(1, expectedAmount);

        vm.prank(orgWallet);
        escrow.claimMilestone(1);
    }
}
