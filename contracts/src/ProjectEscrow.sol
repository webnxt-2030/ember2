// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./PositionNFT.sol";

contract ProjectEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Errors ──────────────────────────────────────────────────────────────
    error ZeroAmount();
    error InvalidBps();
    error OnlyOrg();
    error MilestoneNotVoting();
    error MilestoneAlreadyVoting();
    error MilestoneM0();
    error MilestoneIndexOutOfBounds();
    error VotingWindowClosed();
    error VotingWindowOpen();
    error AlreadyVoted();
    error NotABacker();
    error VotingNotEnded();

    // ─── Events ──────────────────────────────────────────────────────────────
    event Contributed(address indexed backer, uint256 amount, uint256 tokenId, uint256 m0Share);
    event MilestoneSubmitted(uint256 indexed milestoneIndex, string updateURI, uint64 voteEndAt);
    event Voted(uint256 indexed milestoneIndex, address indexed voter, bool yes, uint256 weight);
    event MilestoneResolved(uint256 indexed milestoneIndex, bool passed, uint256 weightYes, uint256 weightNo);

    // ─── Types ───────────────────────────────────────────────────────────────
    enum Status { PENDING, AUTO_RELEASED, VOTING, PASSED, FAILED, CLAIMED }

    struct MilestoneState {
        Status   status;
        uint256  allocated;
        uint64   voteStartAt;
        uint64   voteEndAt;
        uint256  weightYes;
        uint256  weightNo;
        string   updateURI;
        mapping(address => bool) hasVoted;
    }

    // ─── State ───────────────────────────────────────────────────────────────
    IERC20         public immutable usdt;
    PositionNFT    public immutable nft;
    address        public immutable organizationWallet;
    uint16[]       public milestoneBps;
    uint32         public immutable votingPeriod;

    mapping(address => uint256) public totalContributedBy;
    uint256 public totalContributed;
    mapping(uint256 => MilestoneState) internal _milestones;

    // ─── Constructor ─────────────────────────────────────────────────────────
    constructor(
        address usdt_,
        address nft_,
        address organizationWallet_,
        uint16[] memory milestoneBps_,
        uint32  votingPeriod_
    ) {
        if (milestoneBps_.length < 2 || milestoneBps_.length > 20) revert InvalidBps();
        uint256 sum;
        for (uint256 i; i < milestoneBps_.length; ++i) sum += milestoneBps_[i];
        if (sum != 10000) revert InvalidBps();

        usdt               = IERC20(usdt_);
        nft                = PositionNFT(nft_);
        organizationWallet = organizationWallet_;
        milestoneBps       = milestoneBps_;
        votingPeriod       = votingPeriod_;

        // m0 is auto-released from the very first contribution
        _milestones[0].status = Status.AUTO_RELEASED;
    }

    // ─── Contribute ──────────────────────────────────────────────────────────
    function contribute(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        // Effects
        uint256 m0Share = amount * milestoneBps[0] / 10000;
        totalContributed                += amount;
        totalContributedBy[msg.sender]  += amount;

        uint256 n = milestoneBps.length;
        for (uint256 i = 1; i < n; ++i) {
            _milestones[i].allocated += amount * milestoneBps[i] / 10000;
        }

        // Interactions
        usdt.safeTransferFrom(msg.sender, address(this), amount);
        if (m0Share > 0) usdt.safeTransfer(organizationWallet, m0Share);
        uint256 tokenId = nft.mint(msg.sender, amount, m0Share);

        emit Contributed(msg.sender, amount, tokenId, m0Share);
    }

    // ─── Submit Milestone ────────────────────────────────────────────────────
    function submitMilestone(uint256 milestoneIndex, string calldata updateURI)
        external
        nonReentrant
    {
        if (msg.sender != organizationWallet) revert OnlyOrg();
        if (milestoneIndex == 0) revert MilestoneM0();
        if (milestoneIndex >= milestoneBps.length) revert MilestoneIndexOutOfBounds();

        MilestoneState storage m = _milestones[milestoneIndex];
        Status s = m.status;
        if (s == Status.VOTING || s == Status.PASSED || s == Status.CLAIMED) {
            revert MilestoneAlreadyVoting();
        }
        // Allow re-submit after FAILED (SPEC §3.5)

        uint64 start = uint64(block.timestamp);
        uint64 end   = start + votingPeriod;

        m.status      = Status.VOTING;
        m.voteStartAt = start;
        m.voteEndAt   = end;
        m.updateURI   = updateURI;
        m.weightYes   = 0;
        m.weightNo    = 0;

        emit MilestoneSubmitted(milestoneIndex, updateURI, end);
    }

    // ─── Vote ─────────────────────────────────────────────────────────────────
    function vote(uint256 milestoneIndex, bool yes) external nonReentrant {
        if (milestoneIndex == 0) revert MilestoneM0();
        MilestoneState storage m = _milestones[milestoneIndex];

        if (m.status != Status.VOTING) revert MilestoneNotVoting();
        if (block.timestamp >= m.voteEndAt) revert VotingWindowClosed();

        uint256 weight = totalContributedBy[msg.sender];
        if (weight == 0) revert NotABacker();
        if (m.hasVoted[msg.sender]) revert AlreadyVoted();

        m.hasVoted[msg.sender] = true;
        if (yes) {
            m.weightYes += weight;
        } else {
            m.weightNo += weight;
        }

        emit Voted(milestoneIndex, msg.sender, yes, weight);
    }

    // ─── Resolve Milestone ───────────────────────────────────────────────────
    function resolveMilestone(uint256 milestoneIndex) external {
        if (milestoneIndex == 0) revert MilestoneM0();
        MilestoneState storage m = _milestones[milestoneIndex];

        if (m.status != Status.VOTING) revert MilestoneNotVoting();
        if (block.timestamp < m.voteEndAt) revert VotingNotEnded();

        // SPEC §7.2 invariant 6: passed = weightNo * 2 < totalContributed
        // (strict majority NO required to fail; abstain counts as YES)
        bool passed = m.weightNo * 2 < totalContributed;
        m.status = passed ? Status.PASSED : Status.FAILED;

        emit MilestoneResolved(milestoneIndex, passed, m.weightYes, m.weightNo);
    }

    // ─── Views ───────────────────────────────────────────────────────────────
    function votingPowerOf(address backer) external view returns (uint256) {
        return totalContributedBy[backer];
    }

    function milestoneAllocated(uint256 index) external view returns (uint256) {
        return _milestones[index].allocated;
    }

    function milestoneStatus(uint256 index) external view returns (Status) {
        return _milestones[index].status;
    }
}
