// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ProjectEscrow.sol";
import "./PositionNFT.sol";

contract ProjectFactory {
    // ─── Errors ──────────────────────────────────────────────────────────────
    error InvalidBps();
    error InvalidVotingPeriod();
    error ZeroAddress();

    // ─── Constants ───────────────────────────────────────────────────────────
    uint32 public constant MIN_VOTING_PERIOD = 3 days;
    uint32 public constant MAX_VOTING_PERIOD = 30 days;

    // ─── Events ──────────────────────────────────────────────────────────────
    event ProjectCreated(
        uint256 indexed projectId,
        address indexed organization,
        address indexed creator,
        address  escrow,
        address  nft,
        uint16[] milestoneBps,
        uint32   votingPeriod
    );

    // ─── State ───────────────────────────────────────────────────────────────
    address public immutable usdt;
    address public immutable admin;
    string  public appBaseURI;
    uint256 private _projectCount;

    constructor(address usdt_, address admin_, string memory appBaseURI_) {
        if (usdt_ == address(0) || admin_ == address(0)) revert ZeroAddress();
        usdt       = usdt_;
        admin      = admin_;
        appBaseURI = appBaseURI_;
    }

    // ─── createProject ───────────────────────────────────────────────────────
    function createProject(
        address          organizationWallet,
        uint16[] calldata milestoneBps,
        uint32           votingPeriod,
        string  calldata  /*projectURI*/
    )
        external
        returns (uint256 projectId, address escrowAddr, address nftAddr)
    {
        // ── Validate ──────────────────────────────────────────────────────────
        if (organizationWallet == address(0)) revert ZeroAddress();
        uint256 len = milestoneBps.length;
        if (len < 2 || len > 20) revert InvalidBps();
        {
            uint256 sum;
            unchecked { for (uint256 i; i < len; ++i) sum += milestoneBps[i]; }
            if (sum != 10_000) revert InvalidBps();
        }
        if (votingPeriod < MIN_VOTING_PERIOD || votingPeriod > MAX_VOTING_PERIOD) {
            revert InvalidVotingPeriod();
        }

        // ── Assign project ID ─────────────────────────────────────────────────
        projectId = _projectCount++;

        // ── Copy calldata bps to memory ───────────────────────────────────────
        uint16[] memory bpsMem = new uint16[](len);
        unchecked { for (uint256 i; i < len; ++i) bpsMem[i] = milestoneBps[i]; }

        // ── Deploy and wire contracts ──────────────────────────────────────────
        (escrowAddr, nftAddr) = _deploy(organizationWallet, bpsMem, votingPeriod);

        // ── Emit ──────────────────────────────────────────────────────────────
        emit ProjectCreated(
            projectId,
            organizationWallet,
            msg.sender,
            escrowAddr,
            nftAddr,
            bpsMem,
            votingPeriod
        );
    }

    /// @dev Deploys PositionNFT + ProjectEscrow and wires them together.
    ///      Extracted to reduce stack depth in createProject.
    function _deploy(
        address   organizationWallet,
        uint16[]  memory bpsMem,
        uint32    votingPeriod
    ) private returns (address escrowAddr, address nftAddr) {
        // 1. Deploy NFT (escrow not wired yet — factory is msg.sender)
        PositionNFT nft = new PositionNFT(appBaseURI);

        // 2. Deploy Escrow with the NFT address
        ProjectEscrow escrowContract = new ProjectEscrow(
            usdt,
            address(nft),
            organizationWallet,
            bpsMem,
            votingPeriod
        );

        // 3. Wire escrow into NFT (one-time initializer — only callable by factory)
        nft.initEscrow(address(escrowContract));

        escrowAddr = address(escrowContract);
        nftAddr    = address(nft);
    }

    // ─── Views ────────────────────────────────────────────────────────────────
    function projectCount() external view returns (uint256) {
        return _projectCount;
    }
}
