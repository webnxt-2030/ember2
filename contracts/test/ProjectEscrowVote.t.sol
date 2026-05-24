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
contract ProjectEscrowVoteTest is Test {
    MockUSDT      usdt;
    PositionNFT   nft;
    ProjectEscrow escrow;

    address orgWallet = address(0xABCD);
    address backer    = address(0x1234);
    address backer2   = address(0x5678);
    address stranger  = address(0x9999);

    string  constant BASE_URI      = "https://app.ember.example/api/nft/";
    uint32  constant VOTING_PERIOD = 7 days;
    string  constant UPDATE_URI    = "ipfs://QmTestUpdate1";

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

    function _submit(uint256 idx) internal {
        vm.prank(orgWallet);
        escrow.submitMilestone(idx, UPDATE_URI);
    }

    // ─── Tests ───────────────────────────────────────────────────────────────

    // 1. submitMilestone sets status=VOTING, records voteStartAt/voteEndAt/updateURI
    function test_submitMilestone_SetsVotingWindow() public {
        _contribute(backer, 1000e6);

        uint64 ts = uint64(block.timestamp);

        vm.expectEmit(true, false, false, false, address(escrow));
        emit ProjectEscrow.MilestoneSubmitted(1, UPDATE_URI, ts + VOTING_PERIOD);

        vm.prank(orgWallet);
        escrow.submitMilestone(1, UPDATE_URI);

        assertEq(
            uint256(escrow.milestoneStatus(1)),
            uint256(ProjectEscrow.Status.VOTING),
            "status must be VOTING after submitMilestone"
        );

        // Confirm voteEndAt is correct: warp just before end → resolve should revert
        vm.warp(ts + VOTING_PERIOD - 1);
        vm.expectRevert(ProjectEscrow.VotingNotEnded.selector);
        escrow.resolveMilestone(1);

        // Warp past end → resolve succeeds → PASSED (no NO votes)
        vm.warp(ts + VOTING_PERIOD + 1);
        escrow.resolveMilestone(1);
        assertEq(
            uint256(escrow.milestoneStatus(1)),
            uint256(ProjectEscrow.Status.PASSED),
            "should be PASSED after resolve with no votes"
        );
    }

    // 2. vote on a PENDING milestone reverts with MilestoneNotVoting
    function test_vote_RevertsBeforeSubmission() public {
        _contribute(backer, 1000e6);

        vm.prank(backer);
        vm.expectRevert(ProjectEscrow.MilestoneNotVoting.selector);
        escrow.vote(1, true);
    }

    // 3. vote after voteEndAt reverts with VotingWindowClosed
    function test_vote_RevertsAfterVotingEnded() public {
        _contribute(backer, 1000e6);
        _submit(1);

        vm.warp(block.timestamp + VOTING_PERIOD + 1);

        vm.prank(backer);
        vm.expectRevert(ProjectEscrow.VotingWindowClosed.selector);
        escrow.vote(1, true);
    }

    // 4. address with no contributions votes → NotABacker
    function test_vote_RevertsForNonBacker() public {
        _contribute(backer, 1000e6);
        _submit(1);

        vm.prank(stranger);
        vm.expectRevert(ProjectEscrow.NotABacker.selector);
        escrow.vote(1, true);
    }

    // 5. same backer votes twice → AlreadyVoted
    function test_vote_RevertsOnDoubleVote() public {
        _contribute(backer, 1000e6);
        _submit(1);

        vm.prank(backer);
        escrow.vote(1, true);

        vm.prank(backer);
        vm.expectRevert(ProjectEscrow.AlreadyVoted.selector);
        escrow.vote(1, false);
    }

    // 6. resolve before voteEndAt → VotingNotEnded
    function test_resolveMilestone_RevertsBeforeEnd() public {
        _contribute(backer, 1000e6);
        _submit(1);

        vm.expectRevert(ProjectEscrow.VotingNotEnded.selector);
        escrow.resolveMilestone(1);
    }

    // 7. one backer contributes, no one votes, resolve → PASSED (abstain = YES)
    function test_resolveMilestone_AbstainsCountAsYes() public {
        _contribute(backer, 1000e6);
        _submit(1);

        // No one votes — weightNo = 0
        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        escrow.resolveMilestone(1);

        // passed = 0 * 2 < 1000e6 → true → PASSED
        assertEq(
            uint256(escrow.milestoneStatus(1)),
            uint256(ProjectEscrow.Status.PASSED),
            "milestone should PASS when nobody votes (abstain counts as YES)"
        );
    }

    // 8. 2 backers both vote NO → FAILED
    // weightNo = 2000e6, totalContributed = 2000e6
    // passed = 2000e6 * 2 < 2000e6 → false → FAILED
    function test_resolveMilestone_FailsWhenStrictMajorityNo() public {
        _contribute(backer,  1000e6);
        _contribute(backer2, 1000e6);
        _submit(1);

        vm.prank(backer);
        escrow.vote(1, false);
        vm.prank(backer2);
        escrow.vote(1, false);

        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        escrow.resolveMilestone(1);

        assertEq(
            uint256(escrow.milestoneStatus(1)),
            uint256(ProjectEscrow.Status.FAILED),
            "milestone should FAIL when 100% vote NO"
        );
    }

    // 9. 2 equal-weight backers, 1 votes NO (50% of totalContributed).
    // Formula: passed = weightNo * 2 < totalContributed
    //          1000e6 * 2 = 2000e6; 2000e6 < 2000e6 → false → FAILED
    // The formula uses strict-less-than so exactly 50% NO is sufficient to fail.
    // Abstain and YES votes must account for >50% of totalContributed to pass.
    function test_resolveMilestone_ExactlyHalfNoFails() public {
        _contribute(backer,  1000e6);
        _contribute(backer2, 1000e6);
        _submit(1);

        // Only backer votes NO — weightNo = 1000e6 = exactly 50%
        vm.prank(backer);
        escrow.vote(1, false);
        // backer2 abstains

        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        escrow.resolveMilestone(1);

        // passed = 1000e6 * 2 < 2000e6 → 2000e6 < 2000e6 → false → FAILED
        assertEq(
            uint256(escrow.milestoneStatus(1)),
            uint256(ProjectEscrow.Status.FAILED),
            "exactly 50% NO fails per strict < formula"
        );
    }

    // 10. submit a FAILED milestone again → succeeds, resets to VOTING
    function test_submitMilestone_AfterFailedAllowed() public {
        _contribute(backer,  1000e6);
        _contribute(backer2, 1000e6);
        _submit(1);

        // Both vote NO → FAILED
        vm.prank(backer);
        escrow.vote(1, false);
        vm.prank(backer2);
        escrow.vote(1, false);

        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        escrow.resolveMilestone(1);

        assertEq(
            uint256(escrow.milestoneStatus(1)),
            uint256(ProjectEscrow.Status.FAILED),
            "milestone should be FAILED before re-submit"
        );

        // Re-submit the failed milestone — should succeed (re-opens VOTING)
        vm.prank(orgWallet);
        escrow.submitMilestone(1, "ipfs://QmResubmit");

        assertEq(
            uint256(escrow.milestoneStatus(1)),
            uint256(ProjectEscrow.Status.VOTING),
            "milestone should be back in VOTING after re-submit"
        );
    }
}
