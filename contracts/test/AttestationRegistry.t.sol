// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from 'forge-std/Test.sol';
import {AttestationRegistry} from '../src/core/AttestationRegistry.sol';

/// @notice Tests for AttestationRegistry (ERC-8004-style attestation log).
contract AttestationRegistryTest is Test {
    AttestationRegistry internal attestations;
    address internal agent;
    address internal attester;

    function setUp() public {
        agent = makeAddr('agent');
        attester = makeAddr('attester');
        attestations = new AttestationRegistry();
    }

    function test_recordAttestation() public {
        vm.prank(attester);
        bytes32 id = attestations.recordAttestation(agent, 'identity', 'ipfs://QmDemoIdentityAlpha');

        assertEq(attestations.totalAttestations(), 1);

        AttestationRegistry.Attestation memory a = attestations.viewAttestation(id);
        assertEq(a.id, id);
        assertEq(a.agent, agent);
        assertEq(a.attester, attester);
        assertEq(a.attType, 'identity');
        assertEq(a.dataRef, 'ipfs://QmDemoIdentityAlpha');
        assertEq(a.createdAt, block.timestamp);
    }

    function test_getAttestations_returnsIds() public {
        vm.prank(attester);
        bytes32 id1 = attestations.recordAttestation(agent, 'identity', 'ipfs://QmIdentity');
        vm.prank(attester);
        bytes32 id2 = attestations.recordAttestation(agent, 'track_record', 'memory/agents/alpha.md');

        bytes32[] memory ids = attestations.getAttestations(agent);
        assertEq(ids.length, 2);
        assertEq(ids[0], id1);
        assertEq(ids[1], id2);

        // Other agents must not see these attestations.
        assertEq(attestations.getAttestations(makeAddr('otherAgent')).length, 0);
    }

    function test_dataRefStored() public {
        vm.prank(attester);
        bytes32 id = attestations.recordAttestation(agent, 'security_audit', 'memory/attestations/audit-2026.md');

        string memory ref = attestations.viewAttestation(id).dataRef;
        assertEq(ref, 'memory/attestations/audit-2026.md');
    }
}
