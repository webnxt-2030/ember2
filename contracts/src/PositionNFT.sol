// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract PositionNFT is ERC721 {
    using Strings for uint256;
    using Strings for address;

    struct Position {
        uint256 amount;        // USDT contribution (6 decimals)
        uint256 m0Share;       // auto-released milestone-0 share (6 decimals)
        uint64  contributedAt; // block.timestamp at mint
    }

    address public escrow;               // set once by factory via initEscrow()
    address private immutable _factory;  // the deployer; only it may call initEscrow
    string  public baseURI;
    uint256 private _nextTokenId;

    mapping(uint256 => Position) private _positions;

    error OnlyEscrow();
    error EscrowAlreadySet();

    modifier onlyEscrow() {
        if (msg.sender != escrow) revert OnlyEscrow();
        _;
    }

    constructor(string memory baseURI_) ERC721("Ember Position", "EPOS") {
        baseURI  = baseURI_;
        _factory = msg.sender;
    }

    /// @notice Called once by the factory to wire the escrow after both contracts are deployed.
    function initEscrow(address escrow_) external {
        if (msg.sender != _factory) revert OnlyEscrow();
        if (escrow != address(0))   revert EscrowAlreadySet();
        escrow = escrow_;
    }

    function mint(address to, uint256 amount, uint256 m0Share)
        external
        onlyEscrow
        returns (uint256 tokenId)
    {
        tokenId = _nextTokenId++;
        _positions[tokenId] = Position({
            amount:        amount,
            m0Share:       m0Share,
            contributedAt: uint64(block.timestamp)
        });
        _safeMint(to, tokenId);
    }

    function positionOf(uint256 tokenId)
        external
        view
        returns (uint256 amount, uint256 m0Share, uint64 contributedAt)
    {
        _requireOwned(tokenId);
        Position storage p = _positions[tokenId];
        return (p.amount, p.m0Share, p.contributedAt);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        _requireOwned(tokenId);
        return string.concat(
            baseURI,
            Strings.toHexString(address(this)),
            "/",
            tokenId.toString()
        );
    }
}
