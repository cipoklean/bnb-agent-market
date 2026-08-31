// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title HireAgreement
/// @notice Registry of hire agreements between users and agents.
/// @dev Hackathon-minimal contract (spec: "SMART CONTRACT RULES"). IMPORTANT: this contract does NOT custody funds. Budget tokens, payments and
///      settlement happen off-chain / via x402 (see packages/x402 adapter). Status enum:
///      0=Draft, 1=Active, 2=Completed, 3=Revoked, 4=Expired.
contract HireAgreement {
    /*//////////////////////////////////////////////////////////////////////////
                                    ERRORS
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Only the owner (deployer) may call this function.
    error NotOwner();
    /// @notice Caller is neither the user, the agent, nor the owner.
    error NotAuthorized();
    /// @notice Agent address must be non-zero.
    error InvalidAgent();
    /// @notice Expiry must be in the future.
    error InvalidExpiry();
    /// @notice The hire id does not exist.
    error HireNotFound();
    /// @notice Operation requires a hire in Active status.
    error HireNotActive();
    /// @notice A hire can only be completed before its expiry.
    error HireExpired();
    /// @notice New registrations are paused by the owner.
    error Paused();

    /*//////////////////////////////////////////////////////////////////////////
                                    CONSTANTS
    //////////////////////////////////////////////////////////////////////////*/

    uint8 public constant STATUS_DRAFT = 0;
    uint8 public constant STATUS_ACTIVE = 1;
    uint8 public constant STATUS_COMPLETED = 2;
    uint8 public constant STATUS_REVOKED = 3;
    uint8 public constant STATUS_EXPIRED = 4;

    /*//////////////////////////////////////////////////////////////////////////
                                    STRUCTS
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice A hire agreement between a user and an agent.
    struct HireRecord {
        bytes32 id; /// @dev keccak256(user, agent, scopeHash, nonce).
        address user; /// @dev The party hiring (pays for the work).
        address agent; /// @dev The agent being hired.
        bytes32 scopeHash; /// @dev keccak256 of the agreed scope of work.
        string budgetToken; /// @dev Symbol of the budget token (e.g. "BNB").
        uint256 maxTotal; /// @dev Maximum total budget approved by the user.
        uint256 expiry; /// @dev Unix timestamp; hire auto-expires after this.
        uint8 status; /// @dev 0=Draft 1=Active 2=Completed 3=Revoked 4=Expired.
+       bytes32 parent_session_id; /// @dev The hire ID or agent address that delegated this hire.
                                       ///  - bytes32(0) → hired directly by human
                                       ///  - any hire ID → hired BY that agent (sub-agent)
    }

    /*//////////////////////////////////////////////////////////////////////////
                                    STATE
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Owner of the registry (deployer).
    address public immutable owner;
    /// @notice Total hires registered.
    uint256 public hireCount;
    /// @notice Pause flag — new registrations blocked while true.
    bool public paused;

    /// @notice id => hire agreement.
    mapping(bytes32 id => HireRecord) public hires;
    /// @notice user => hire ids created by that user.
    mapping(address user => bytes32[] ids) private hiresByUser;

    /*//////////////////////////////////////////////////////////////////////////
                                    EVENTS
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a hire is registered.
    event HireRegistered(
        bytes32 indexed id,
        address indexed user,
        address indexed agent,
        bytes32 scopeHash,
        uint256 expiry
    );
    /// @notice Emitted when a hire is revoked (by user, agent, or owner).
    event HireRevoked(bytes32 indexed id, address indexed by);
    /// @notice Emitted when a hire is completed.
    event HireCompleted(bytes32 indexed id);
    /// @notice Emitted when the pause flag changes.
    event PausedSet(bool paused);

    /*//////////////////////////////////////////////////////////////////////////
                                    MODIFIERS
    //////////////////////////////////////////////////////////////////////////*/

    /// @notice Restricts a function to the owner (deployer).
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
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

    /// @notice Register a new hire agreement. Called by the hiring user (msg.sender).
    /// @param agent The agent being hired (must be non-zero).
    /// @param scopeHash keccak256 of the agreed scope of work.
    /// @param budgetToken Symbol of the budget token (e.g. "BNB").
    /// @param maxTotal Maximum total budget approved by the user.
    /// @param expiry Unix timestamp; hire auto-expires after this.
+   /// @param parent_session_id The hire ID or agent address that delegated this hire.
+   ///  - bytes32(0) → hired directly by human
+   ///  - any hire ID → hired BY that agent (sub-agent)
    function registerHire(
        address agent,
        bytes32 scopeHash,
        string calldata budgetToken,
        uint256 maxTotal,
        uint256 expiry,
+       bytes32 parent_session_id
    ) external returns (bytes32 id) {
        if (paused) revert Paused();
        if (agent == address(0)) revert InvalidAgent();
        if (expiry <= block.timestamp) revert InvalidExpiry();

        hireCount++;
        id = keccak256(abi.encodePacked(msg.sender, agent, scopeHash, hireCount));

        hires[id] = HireRecord({
            id: id,
            user: msg.sender,
            agent: agent,
            scopeHash: scopeHash,
            budgetToken: budgetToken,
            maxTotal: maxTotal,
            expiry: expiry,
            status: STATUS_ACTIVE,
+           parent_session_id: parent_session_id
        });
        hiresByUser[msg.sender].push(id);

        emit HireRegistered(id, msg.sender, agent, scopeHash, expiry);
    }

    /// @notice Revoke a hire. Allowed for the user, the agent, or the owner.
    /// @param id The hire id.
    /// @dev Reverts if the caller is an agent trying to revoke a session
    ///     that is not its delegated sub-hire.
    function revoke(bytes32 id) external {
        HireRecord storage hire = _requireActive(id);
        address user = hire.user;
        address agent = hire.agent;

        // Hierarchy validation: agent may only revoke its own sub-hire
        if (msg.sender == agent && hire.parent_session_id != msg.sender) {
            revert NotAuthorized();
        }

        if (msg.sender != user && msg.sender != agent && msg.sender != owner) {
            revert NotAuthorized();
        }

        hire.status = STATUS_REVOKED;
        emit HireRevoked(id, msg.sender);
    }

    /// @notice Mark a hire completed. Only possible while the hire is active
    ///         and before its expiry.
    /// @param id The hire id.
    function completeHire(bytes32 id) external {
        HireRecord storage hire = _requireActive(id);
        if (block.timestamp > hire.expiry) revert HireExpired();
        hire.status = STATUS_COMPLETED;
        emit HireCompleted(id);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                    INTERNAL
    //////////////////////////////////////////////////////////////////////////*/

    /// @dev Returns the hire storage pointer and reverts if missing or not Active.
    function _requireActive(bytes32 id) private view returns (HireRecord storage hire) {
        hire = hires[id];
        if (hire.id == bytes32(0)) revert HireNotFound();
        if (hire.status != STATUS_ACTIVE) revert HireNotActive();
    }
}