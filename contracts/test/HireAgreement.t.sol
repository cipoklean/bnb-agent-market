// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from 'forge-std/Test.sol';
import {HireAgreement} from '../src/core/HireAgreement.sol';

/// @notice Tests for HireAgreement (hackathon-minimal hire registry).
contract HireAgreementTest is Test {
    HireAgreement internal hireRegistry;
    address internal user;
    address internal agent;
    address internal stranger;

    bytes32 internal constant SCOPE_HASH = keccak256('lp_rebalance: BNB/USDT range 500-600');

    function setUp() public {
        user = makeAddr('user');
        agent = makeAddr('agent');
        stranger = makeAddr('stranger');
        hireRegistry = new HireAgreement();
    }

    function _register() internal returns (bytes32 id) {
        vm.prank(user);
        id = hireRegistry.registerHire(agent, SCOPE_HASH, 'BNB', 5 ether, block.timestamp + 7 days);
    }

    function _status(bytes32 id) internal view returns (uint8) {
        (, , , , , , , uint8 status_) = hireRegistry.hires(id);
        return status_;
    }

    function test_registerHire_setsFields() public {
        bytes32 id = _register();

        (bytes32 storedId, address storedUser, address storedAgent, bytes32 storedScope,
            string memory token, uint256 maxTotal, uint256 expiry, uint8 status) = hireRegistry.hires(id);

        assertEq(storedId, id);
        assertEq(storedUser, user);
        assertEq(storedAgent, agent);
        assertEq(storedScope, SCOPE_HASH);
        assertEq(token, 'BNB');
        assertEq(maxTotal, 5 ether);
        assertEq(expiry, block.timestamp + 7 days);
        assertEq(uint256(status), uint256(hireRegistry.STATUS_ACTIVE()));

        bytes32[] memory ids = hireRegistry.toListHiresFor(user);
        assertEq(ids.length, 1);
        assertEq(ids[0], id);
    }

    function test_revoke_byUser() public {
        bytes32 id = _register();

        vm.prank(user);
        hireRegistry.revoke(id);

        assertEq(uint256(_status(id)), uint256(hireRegistry.STATUS_REVOKED()));
    }

    function test_revoke_byAgent() public {
        bytes32 id = _register();

        vm.prank(agent);
        hireRegistry.revoke(id);

        assertEq(uint256(_status(id)), uint256(hireRegistry.STATUS_REVOKED()));
    }

    function test_revokeOnlyAuthorized() public {
        bytes32 id = _register();

        vm.prank(stranger);
        vm.expectRevert(HireAgreement.NotAuthorized.selector);
        hireRegistry.revoke(id);
    }

    function test_completeHire_beforeExpiry() public {
        bytes32 id = _register();

        hireRegistry.completeHire(id);

        assertEq(uint256(_status(id)), uint256(hireRegistry.STATUS_COMPLETED()));
    }

    function test_expiryCheck_completeAfterExpiryReverts() public {
        vm.prank(user);
        bytes32 id = hireRegistry.registerHire(agent, SCOPE_HASH, 'BNB', 5 ether, block.timestamp + 100);

        vm.warp(block.timestamp + 200); // past expiry
        vm.expectRevert(HireAgreement.HireExpired.selector);
        hireRegistry.completeHire(id);
    }
}
