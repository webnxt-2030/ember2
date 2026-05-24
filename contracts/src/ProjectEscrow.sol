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

    // ─── Events ──────────────────────────────────────────────────────────────
    event Contributed(address indexed backer, uint256 amount, uint256 tokenId, uint256 m0Share);

    // ─── Types ───────────────────────────────────────────────────────────────
    enum Status { PENDING, AUTO_RELEASED, VOTING, PASSED, FAILED, CLAIMED }

    struct MilestoneState {
        Status   status;
        uint256  allocated;
        // vote fields will be added in issues #17/#18:
        // uint64 voteStartAt; uint64 voteEndAt; uint256 weightYes; uint256 weightNo; string updateURI; mapping(address => bool) hasVoted;
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
