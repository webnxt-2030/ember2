// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/PositionNFT.sol";

contract PositionNFTTest is Test {
    PositionNFT nft;
    address escrow  = address(0x1);
    address backer  = address(0x2);
    string  baseURI = "https://app.ember.example/api/nft/";

    function setUp() public {
        nft = new PositionNFT(escrow, baseURI);
    }

    // -----------------------------------------------------------------------
    // test_mint_StoresPosition
    // Mint a token and verify positionOf returns the correct stored values.
    // -----------------------------------------------------------------------
    function test_mint_StoresPosition() public {
        uint256 amount  = 100e6; // 100 USDT
        uint256 m0Share = 10e6;  // 10 USDT

        vm.warp(1_700_000_000); // fix timestamp for deterministic check

        vm.prank(escrow);
        uint256 tokenId = nft.mint(backer, amount, m0Share);

        (uint256 storedAmount, uint256 storedM0Share, uint64 storedAt) = nft.positionOf(tokenId);

        assertEq(storedAmount,  amount,            "amount mismatch");
        assertEq(storedM0Share, m0Share,           "m0Share mismatch");
        assertEq(storedAt,      uint64(1_700_000_000), "contributedAt mismatch");
    }

    // -----------------------------------------------------------------------
    // test_mint_ReturnsIncrementingTokenIds
    // Two successive mints should return tokenId 0 and 1.
    // -----------------------------------------------------------------------
    function test_mint_ReturnsIncrementingTokenIds() public {
        vm.startPrank(escrow);
        uint256 id0 = nft.mint(backer, 50e6, 5e6);
        uint256 id1 = nft.mint(backer, 75e6, 7e6);
        vm.stopPrank();

        assertEq(id0, 0, "first tokenId should be 0");
        assertEq(id1, 1, "second tokenId should be 1");
    }

    // -----------------------------------------------------------------------
    // test_mint_RevertsIfNotEscrow
    // Calling mint from a non-escrow address must revert with OnlyEscrow.
    // -----------------------------------------------------------------------
    function test_mint_RevertsIfNotEscrow() public {
        address attacker = address(0x3);
        vm.prank(attacker);
        vm.expectRevert(PositionNFT.OnlyEscrow.selector);
        nft.mint(backer, 100e6, 10e6);
    }

    // -----------------------------------------------------------------------
    // test_tokenURI_Format
    // tokenURI must equal baseURI + lowercase-hex contract address + "/" + tokenId.
    // -----------------------------------------------------------------------
    function test_tokenURI_Format() public {
        vm.prank(escrow);
        uint256 tokenId = nft.mint(backer, 100e6, 10e6);

        string memory uri = nft.tokenURI(tokenId);

        // Must start with baseURI
        assertTrue(
            _startsWith(uri, baseURI),
            "tokenURI must start with baseURI"
        );

        // Must contain the lowercased contract address (as produced by Strings.toHexString)
        string memory addrStr = Strings.toHexString(address(nft));
        assertTrue(
            _contains(uri, addrStr),
            "tokenURI must contain the contract address"
        );

        // Must contain the tokenId string
        string memory idStr = Strings.toString(tokenId);
        assertTrue(
            _contains(uri, idStr),
            "tokenURI must contain the tokenId"
        );

        // Full manual check: baseURI + addr + "/" + id
        string memory expected = string.concat(baseURI, addrStr, "/", idStr);
        assertEq(uri, expected, "tokenURI format mismatch");
    }

    // -----------------------------------------------------------------------
    // test_positionOf_RevertsForNonexistentToken
    // positionOf on a token that has never been minted must revert.
    // -----------------------------------------------------------------------
    function test_positionOf_RevertsForNonexistentToken() public {
        vm.expectRevert();
        nft.positionOf(999);
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    /// @dev Returns true if `str` starts with `prefix`.
    function _startsWith(string memory str, string memory prefix)
        internal
        pure
        returns (bool)
    {
        bytes memory s = bytes(str);
        bytes memory p = bytes(prefix);
        if (p.length > s.length) return false;
        for (uint256 i = 0; i < p.length; i++) {
            if (s[i] != p[i]) return false;
        }
        return true;
    }

    /// @dev Returns true if `haystack` contains `needle`.
    function _contains(string memory haystack, string memory needle)
        internal
        pure
        returns (bool)
    {
        bytes memory h = bytes(haystack);
        bytes memory n = bytes(needle);
        if (n.length == 0) return true;
        if (n.length > h.length) return false;
        for (uint256 i = 0; i <= h.length - n.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < n.length; j++) {
                if (h[i + j] != n[j]) {
                    found = false;
                    break;
                }
            }
            if (found) return true;
        }
        return false;
    }
}
