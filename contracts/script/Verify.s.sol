// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";

/**
 * @notice Verification script for Morph explorer.
 *
 * After deploying with DeployFactory.s.sol, verify contracts using:
 *
 * ProjectFactory:
 *   forge verify-contract \
 *     --chain-id 2818 \
 *     --verifier-url https://explorer.morphl2.io/api \
 *     --etherscan-api-key "irrelevant" \
 *     --watch \
 *     <FACTORY_ADDRESS> \
 *     contracts/src/ProjectFactory.sol:ProjectFactory \
 *     --constructor-args $(cast abi-encode "constructor(address,address,string)" \
 *       $USDT_ADDRESS $ADMIN_ADDRESS $APP_BASE_URI)
 *
 * ProjectEscrow (per project):
 *   forge verify-contract \
 *     --chain-id 2818 \
 *     --verifier-url https://explorer.morphl2.io/api \
 *     --etherscan-api-key "irrelevant" \
 *     <ESCROW_ADDRESS> \
 *     contracts/src/ProjectEscrow.sol:ProjectEscrow \
 *     --constructor-args $(cast abi-encode "constructor(address,address,uint256,uint16[],uint32)" \
 *       $USDT_ADDRESS $FACTORY_ADDRESS <projectId> [...milestones] <votingPeriod>)
 *
 * PositionNFT (per project):
 *   forge verify-contract \
 *     --chain-id 2818 \
 *     --verifier-url https://explorer.morphl2.io/api \
 *     --etherscan-api-key "irrelevant" \
 *     <NFT_ADDRESS> \
 *     contracts/src/PositionNFT.sol:PositionNFT \
 *     --constructor-args $(cast abi-encode "constructor(string,string,address,string)" \
 *       "Ember Position" "EMBER" <factory> $APP_BASE_URI)
 *
 * @dev This Script contract is intentionally left with an empty run() since
 * verification is a forge CLI operation, not an on-chain transaction.
 */
contract Verify is Script {
    function run() external view {
        console2.log("See script comments for forge verify-contract commands.");
        console2.log("Factory address:", vm.envAddress("FACTORY_ADDRESS"));
    }
}
