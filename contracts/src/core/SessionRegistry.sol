// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SessionRegistry
/// @notice Runtime execution sessions with spend caps, expiry, and revocation.
/// @dev Hackathon-minimal contract. Sessions gate agent actions: the confirmation gate
///      (packages/confirmation) runs off-chain, `recordSpend` enforces the on-chain
///      spend cap. NO funds are held by this contract.
contract SessionRegistry {
    /*//////////////////////////////////////////////////////////////////////////
                                    ERRORS
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Session id does not exist.
    error SessionNotFound_();
    /// @notice Session has been revoked.
    error SessionRevoked_();
    /// @notice Session has expired.
    error SessionExpired_();
    /// @notice Spend would exceed the session spend cap.
    error CapExceeded_(uint256 cap, uint256 spent);
    /// @notice Caller is not authorized for this action.
    error NotAuthorized_();
    /// @notice Session creation arguments are invalid.
    error InvalidSession_();
    /// @notice Contract is paused by the owner.
    error Paused_();

    /*//////////////////////////////////////////////////////////////////////////
                                    STRUCTS
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice A runtime session with an enforced spend cap.
    struct Session {
        bytes32 id; /// @dev keccak256(user, agent, nonce).
        bytes32 hireId; /// @dev Linked HireAgreement id, or bytes32(0) if none.
        address user; /// @dev The user who authorized the session.
        address agent; /// @dev The agent operating within the session.
        bytes32 parent_session_id; /// @dev The session ID or agent address that delegated this session.
                                 ///  - bytes32(0) → hired by the human
                                 ///  - any session ID → hired BY that agent (sub-agent)
        bytes32 sessionKeyHash; /// @dev keccak256 of the agent's session key.
        string spendToken; /// @dev Symbol of the spend token (e.g. "BNB").
        uint256 spendCap; /// @dev Max total spend for the session.
        uint256 spent; /// @dev Accumulated spend.
        uint256 expiry; /// @dev Unix timestamp; session expires after this.
        bool revoked; /// @dev True once revoked by user/agent/owner.
        bytes32 allowedTargetsHash; /// @dev keccak256(abi.encode(targets)) or 0 = any.
        bytes32 allowedSelectorsHash; /// @dev keccak256(abi.encode(selectors)) or 0 = any.
    }

    /*//////////////////////////////////////////////////////////////////////////
                                    STATE
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Owner of the registry (deployer).
    address public immutable owner;
    /// @notice Total sessions created.
    uint256 public sessionCount;
    /// @notice Pause flag — new sessions and spend records blocked while true.
    bool public paused;

    /// @notice id => session.
    mapping(bytes32 id => Session) public sessions;
    /// @notice user => session ids created for that user.
    mapping(address user => bytes32[] ids) private sessionsByUser;

    /*//////////////////////////////////////////////////////////////////////////
                                    EVENTS
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a session is created.
    event SessionCreated(
        bytes32 indexed id,
        bytes32 indexed hireId,
        address indexed user,
        address agent,
        bytes32 sessionKeyHash,
        string spendToken,
        uint256 spendCap,
        uint256 expiry,
        bytes32 allowedTargetsHash,
        bytes32 allowedSelectorsHash
    );
    /// @notice Emitted every time spend is recorded against a session.
    event SessionSpent(bytes32 indexed sessionId, uint256 amount, uint256 spent);
    /// @notice Emitted when a session is revoked.
    event SessionRevoked(bytes32 indexed sessionId, address indexed by);
    /// @notice Emitted when the pause flag changes.
    event PausedSet(bool paused);

    /*//////////////////////////////////////////////////////////////////////////
                                    MODIFIERS
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Restricts a function to the owner (deployer).
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized_();
        _;
    }

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

    /// @notice Create a runtime session. Caller must be the user or the owner.
    /// @return id The unique session id.
    /// @param parent_session_id The session ID or agent address that delegated this session.
    ///  - bytes32(0) → hired by the human
    ///  - any session ID → hired BY that agent (sub-agent)
    function createSession(
        address user,
        address agent,
        bytes32 hireId,
        bytes32 sessionKeyHash,
        string calldata spendToken,
        uint256 spendCap,
        uint256 expiry,
        bytes32 allowedTargetsHash,
        bytes32 allowedSelectorsHash,
        bytes32 parent_session_id
    ) external returns (bytes32 id) {
        if (paused) revert Paused_();
        if (msg.sender != user && msg.sender != owner) revert NotAuthorized_();
        if (user == address(0) || agent == address(0)) revert InvalidSession_();
        if (expiry <= block.timestamp) revert InvalidSession_();

        sessionCount++;
        id = keccak256(abi.encodePacked(user, agent, sessionCount));

        sessions[id] = Session({
            id: id,
            hireId: hireId,
            user: user,
            agent: agent,
            parent_session_id: parent_session_id,
            sessionKeyHash: sessionKeyHash,
            spendToken: spendToken,
            spendCap: spendCap,
            spent: 0,
            expiry: expiry,
            revoked: false,
            allowedTargetsHash: allowedTargetsHash,
            allowedSelectorsHash: allowedSelectorsHash
        });
        sessionsByUser[user].push(id);

        emit SessionCreated(
            id, hireId, user, agent, sessionKeyHash, spendToken, spendCap, expiry,
            allowedTargetsHash, allowedSelectorsHash
        );
    }

    /// @notice Record spend against a session. Caller must be the user, the agent,
    ///         or the owner. Reverts if the session is revoked, expired, or the cap
    ///         would be exceeded.
    function recordSpend(bytes32 sessionId, uint256 amount) external {
        if (paused) revert Paused_();

        Session storage session = _requireSession(sessionId);
        if (session.revoked) revert SessionRevoked_();
        if (block.timestamp > session.expiry) revert SessionExpired_();

        if (msg.sender != session.user && msg.sender != session.agent && msg.sender != owner) {
            revert NotAuthorized_();
        }

        uint256 newSpent = session.spent + amount;
        if (newSpent > session.spendCap) revert CapExceeded_(session.spendCap, session.spent);

        session.spent = newSpent;
        emit SessionSpent(sessionId, amount, newSpent);
    }

    /// @notice Revoke a session. Owner may revoke any session; the user or the agent
    ///         may only revoke their own, respecting the delegation hierarchy.
    /// @param by Caller-reported revoker address, kept for OFF-CHAIN attribution.
    ///        IMPORTANT: attribution is caller-reported, not trustless — any caller
    ///        may pass any address here. The indexer log of `msg.sender` plus any
    ///        signed/off-chain evidence is the authoritative record of who revoked.
    ///        Pass address(0) to record `msg.sender`.
    /// @dev Emits SessionRevoked. Only the session owner, the session user, or an agent
    ///     may revoke a session. An agent may only revoke a session whose
    ///     parent_session_id matches the agent's address (i.e. the sub-agent it delegated).
    function revokeSession(bytes32 sessionId, address by) external {
        Session storage session = _requireSession(sessionId);

        // Hierarchy validation: check revocation rights based on delegation
        bool isOwner = msg.sender == owner;
        bool isUser = msg.sender == session.user;
        bool isAgent = msg.sender == session.agent;

        // Agent may only revoke sessions it delegated (parent_session_id matches agent)
        if (isAgent && session.parent_session_id != msg.sender) {
            revert NotAuthorized_();
        }

        if (!isOwner && !isUser && !isAgent) revert NotAuthorized_();

        address revoker = by == address(0) ? msg.sender : by;
        session.revoked = true;
        emit SessionRevoked(sessionId, revoker);
    }

    /// @notice Pause/unpause session creation and spend recording. Owner only.
    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit PausedSet(paused);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                    VIEW
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Returns the full session struct.
    function getSession(bytes32 sessionId) external view returns (Session memory) {
        return _requireSession(sessionId);
    }

    /// @notice True while the session exists, is not revoked, and is not expired.
    function isActive(bytes32 sessionId) external view returns (bool) {
        Session storage session = sessions[sessionId];
        if (session.id == bytes32(0)) return false;
        return !session.revoked && block.timestamp <= session.expiry;
    }

    /// @notice List all session ids created for a user.
    function toListSessionsFor(address user) external view returns (bytes32[] memory) {
        return sessionsByUser[user];
    }

    /*//////////////////////////////////////////////////////////////////////////
                                    INTERNAL
    //////////////////////////////////////////////////////////////////////////*/

    /// @dev Returns the session storage pointer and reverts if missing.
    function _requireSession(bytes32 sessionId) private view returns (Session storage session) {
        session = sessions[sessionId];
        if (session.id == bytes32(0)) revert SessionNotFound_();
    }
}