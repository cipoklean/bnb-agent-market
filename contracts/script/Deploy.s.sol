// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';
import {HireAgreement} from '../src/core/HireAgreement.sol';
import {SessionRegistry} from '../src/core/SessionRegistry.sol';
import {AttestationRegistry} from '../src/core/AttestationRegistry.sol';

/// @notice Deploys the BNB Agent Market Core contracts and prints their addresses.
/// @dev Usage:
///      forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --slow
///      (local) forge script script/Deploy.s.sol --fork-url $RPC_URL
contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();

        HireAgreement hireAgreement = new HireAgreement();
        SessionRegistry sessionRegistry = new SessionRegistry();
        AttestationRegistry attestationRegistry = new AttestationRegistry();

        vm.stopBroadcast();

        console2.log('=== BNB Agent Market Core deployment ===');
        console2.log('HireAgreement deployed at:      ', address(hireAgreement));
        console2.log('SessionRegistry deployed at:    ', address(sessionRegistry));
        console2.log('AttestationRegistry deployed at:', address(attestationRegistry));
        console2.log('NOTE: official ERC-8004 / x402 / PancakeSwap addresses are UNKNOWN -');
        console2.log('adapter packages (packages/*) must be pointed at verified addresses.');
    }
}
