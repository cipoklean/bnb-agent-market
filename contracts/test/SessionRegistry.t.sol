// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from 'forge-std/Test.sol';
import {SessionRegistry} from '../src/core/SessionRegistry.sol';

/// @notice Tests for SessionRegistry (runtime sessions with spend caps).
contract SessionRegistryTest is Test {
    SessionRegistry internal sessions;
    address internal user;
    address internal agent;
    address internal stranger;

    bytes32 internal constant HIRE_ID = keccak256('hire-001');
    bytes32 internal constant SESSION_KEY_HASH = keccak256('demo-session-key');
    bytes32 internal constant TARGETS_HASH =
        keccak256(abi.encode('0xPancakeSwapV3Router', '0xPancakeSwapPositionManager'));
    bytes32 internal constant SELECTORS_HASH = keccak256(abi.encode('rebalance', 'collectFees'));

    function setUp() public {
        user = makeAddr('user');
        agent = makeAddr('agent');
        stranger = makeAddr('stranger');
        sessions = new SessionRegistry();
    }

    function _createSession() internal returns (bytes32 id) {
        vm.prank(user);
        id = sessions.createSession(
            user, agent, HIRE_ID, SESSION_KEY_HASH, 'BNB', 5 ether,
            block.timestamp + 7 days, TARGETS_HASH, SELECTORS_HASH
        );
    }

    function _createShortSession() internal returns (bytes32 id) {
        vm.prank(user);
        id = sessions.createSession(
            user, agent, HIRE_ID, SESSION_KEY_HASH, 'BNB', 5 ether,
            block.timestamp + 100, TARGETS_HASH, SELECTORS_HASH
        );
    }

    function test_createSession() public {
        bytes32 id = _createSession();

        SessionRegistry.Session memory s = sessions.getSession(id);
        assertEq(s.id, id);
        assertEq(s.hireId, HIRE_ID);
        assertEq(s.user, user);
        assertEq(s.agent, agent);
        assertEq(s.sessionKeyHash, SESSION_KEY_HASH);
        assertEq(s.spendToken, 'BNB');
        assertEq(s.spendCap, 5 ether);
        assertEq(s.spent, 0);
        assertEq(s.expiry, block.timestamp + 7 days);
        assertFalse(s.revoked);
        assertEq(s.allowedTargetsHash, TARGETS_HASH);
        assertEq(s.allowedSelectorsHash, SELECTORS_HASH);
        assertTrue(sessions.isActive(id));

        bytes32[] memory ids = sessions.toListSessionsFor(user);
        assertEq(ids.length, 1);
        assertEq(ids[0], id);
    }

    function test_recordSpend_withinCap() public {
        bytes32 id = _createSession();

        vm.prank(agent);
        sessions.recordSpend(id, 1 ether);

        vm.prank(agent);
        sessions.recordSpend(id, 2 ether);

        assertEq(sessions.getSession(id).spent, 3 ether);
    }

    function test_recordSpend_overCap_reverts() public {
        bytes32 id = _createSession();

        vm.prank(agent);
        sessions.recordSpend(id, 3 ether);

        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(SessionRegistry.CapExceeded_.selector, 5 ether, 3 ether)
        );
        sessions.recordSpend(id, 3 ether);
    }

    function test_revoke_blocksSpend() public {
        bytes32 id = _createSession();

        vm.prank(agent);
        sessions.revokeSession(id, agent);

        vm.prank(agent);
        vm.expectRevert(SessionRegistry.SessionRevoked_.selector);
        sessions.recordSpend(id, 1 ether);

        assertFalse(sessions.isActive(id));
    }

    function test_expired_blocksSpend() public {
        bytes32 id = _createShortSession();

        vm.warp(block.timestamp + 200); // past expiry
        vm.prank(agent);
        vm.expectRevert(SessionRegistry.SessionExpired_.selector);
        sessions.recordSpend(id, 1 ether);

        assertFalse(sessions.isActive(id));
    }

    function test_revokeOnlyAuthorized() public {
        bytes32 id = _createSession();

        vm.prank(stranger);
        vm.expectRevert(SessionRegistry.NotAuthorized_.selector);
        sessions.revokeSession(id, stranger);
    }
}
