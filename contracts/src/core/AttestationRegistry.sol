// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AttestationRegistry
/// @notice Lightweight ERC-8004-style attestation log for agents.
/// @dev IMPORTANT: the official ERC-8004 registry (BNB Agent Studio / AltLayer) address
///      and ABI are UNKNOWN (see memory/UNKNOWN_ITEMS.md). This contract is the
///      marketplace's OWN attestation log until the official registry is verified —
///      it is NOT a claim of ERC-8004 compliance. Attestations carry off-chain data
///      references (identity + track record) so nothing sensitive lives on-chain.
///      Permissionless by design (attester = msg.sender): it only logs records and
///      holds no funds or actions, so no pause mechanism is required.
contract AttestationRegistry {
    /*//////////////////////////////////////////////////////////////////////////
                                    ERRORS
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Agent address must be non-zero.
    error InvalidAgent_();
    /// @notice Attestation id does not exist.
    error AttestationNotFound_();

    /*//////////////////////////////////////////////////////////////////////////
                                    STRUCTS
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice A single attestation record for an agent.
    struct Attestation {
        bytes32 id; /// @dev keccak256(agent, attester, attType, dataRef, nonce).
        address agent; /// @dev The agent being attested.
        address attester; /// @dev Who recorded the attestation (msg.sender).
        string attType; /// @dev e.g. "identity", "track_record", "security_audit".
        string dataRef; /// @dev Off-chain reference: IPFS CID / URL / memory file path.
        uint256 createdAt; /// @dev Unix timestamp.
    }

    /*//////////////////////////////////////////////////////////////////////////
                                    STATE
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Owner of the registry (deployer).
    address public immutable owner;
    /// @notice Total attestations recorded.
    uint256 public attestationCount;

    /// @notice id => attestation.
    mapping(bytes32 id => Attestation) public attestations;
    /// @notice agent => attestation ids.
    mapping(address agent => bytes32[] ids) private agentAttestations;

    /*//////////////////////////////////////////////////////////////////////////
                                    EVENTS
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Emitted for every recorded attestation.
    event AttestationRecorded(
        bytes32 indexed id,
        address indexed agent,
        address indexed attester,
        string attType,
        string dataRef
    );

    /*//////////////////////////////////////////////////////////////////////////
                                    CONSTRUCTOR
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Deployer becomes owner.
    constructor() {
        owner = msg.sender;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                    WRITE
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Record an attestation for an agent. The attester is msg.sender.
    /// @param agent The agent being attested (must be non-zero).
    /// @param attType Attestation type (e.g. "identity", "track_record").
    /// @param dataRef Off-chain reference to the attestation payload.
    /// @return id The unique attestation id.
    function recordAttestation(
        address agent,
        string calldata attType,
        string calldata dataRef
    ) external returns (bytes32 id) {
        if (agent == address(0)) revert InvalidAgent_();

        attestationCount++;
        id = keccak256(abi.encodePacked(agent, msg.sender, attType, dataRef, attestationCount));

        attestations[id] = Attestation({
            id: id,
            agent: agent,
            attester: msg.sender,
            attType: attType,
            dataRef: dataRef,
            createdAt: block.timestamp
        });
        agentAttestations[agent].push(id);

        emit AttestationRecorded(id, agent, msg.sender, attType, dataRef);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                    VIEW
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Get all attestation ids for an agent.
    function getAttestations(address agent) external view returns (bytes32[] memory) {
        return agentAttestations[agent];
    }

    /// @notice View a single attestation.
    function viewAttestation(bytes32 id) external view returns (Attestation memory) {
        Attestation memory a = attestations[id];
        if (a.id == bytes32(0)) revert AttestationNotFound_();
        return a;
    }

    /// @notice Total number of attestations recorded.
    function totalAttestations() external view returns (uint256) {
        return attestationCount;
    }
}
