// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/ProjectFactory.sol";

contract DeployFactory is Script {
    function run() external returns (ProjectFactory factory) {
        address usdt           = vm.envAddress("USDT_ADDRESS");
        address admin          = vm.envAddress("ADMIN_ADDRESS");
        string memory appBaseURI = vm.envString("APP_BASE_URI");
        uint256 deployerKey    = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        factory = new ProjectFactory(usdt, admin, appBaseURI);
        vm.stopBroadcast();

        console2.log("ProjectFactory deployed at:", address(factory));
        console2.log("USDT:", usdt);
        console2.log("Admin:", admin);
    }
}
