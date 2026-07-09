// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IObligationRegistry, IAuditLog} from "./interfaces/IClearLoop.sol";

/// @title NettingEngine
/// @notice Orquesta el ciclo de compresión multilateral de deuda: propuesta,
///         firmas EIP-712 multi-party, validación on-chain de Sigma-Delta=0,
///         y ejecución atómica de la extinción de obligaciones.
/// @dev TRUST BOUNDARY: ObligationRegistry confía completamente en que este
///      contrato valida Σ∆=0 y las firmas antes de llamar markSettled().
///      Un bug aquí compromete la integridad económica de todo el sistema.
contract NettingEngine {
    // ---------------------------------------------------------------------
    // Tipos
    // ---------------------------------------------------------------------

    enum ProposalStatus {
        Pending,
        Executed,
        Rejected
    }

    struct Proposal {
        bytes32[] cycleIds;
        address[] participants;
        uint256 totalAmount;
        uint256 approvalCount;
        uint256 deadline;
        ProposalStatus status;
    }

    // ---------------------------------------------------------------------
    // Constantes de configuración
    // ---------------------------------------------------------------------

    /// @dev Un ciclo mínimo viable es A<->B (2 obligaciones cruzadas).
    uint256 public constant MIN_CYCLE_LENGTH = 2;

    /// @dev Límite superior para acotar el costo de gas de _validateCycle
    ///      (O(N) llamadas externas + O(N) trabajo en memoria). 10 es más
    ///      que suficiente para cualquier demo de hackathon.
    uint256 public constant MAX_CYCLE_LENGTH = 10;

    /// @dev Ventana de tiempo para juntar las N firmas antes de que la
    ///      propuesta expire y haya que re-proponerla.
    uint256 public constant PROPOSAL_WINDOW = 3 days;

    // ---------------------------------------------------------------------
    // EIP-712
    // ---------------------------------------------------------------------

    bytes32 private constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 private constant APPROVE_TYPEHASH = keccak256(
        "ApproveNetting(uint256 proposalId,address signer,uint256 nonce,uint256 deadline)"
    );

    bytes32 private immutable DOMAIN_SEPARATOR;

    /// @notice Nonce por firmante — se incrementa en cada aprobación válida.
    ///         Previene que una firma vieja se reutilice (replay) en una
    ///         propuesta distinta con los mismos participantes.
    mapping(address => uint256) public nonces;

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    IObligationRegistry public immutable obligationRegistry;
    IAuditLog public immutable auditLog;

    mapping(uint256 => Proposal) private proposals;
    mapping(uint256 => mapping(address => bool)) private hasApproved;
    uint256 public proposalCount;

    /// @dev Mutex manual de reentrancy — sin dependencia de OpenZeppelin
    ///      para mantener el proyecto sin dependencias externas.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;
    uint256 private reentrancyStatus = NOT_ENTERED;

    // ---------------------------------------------------------------------
    // Eventos
    // ---------------------------------------------------------------------

    event NettingProposed(uint256 indexed proposalId, bytes32[] cycleIds, uint256 deadline);
    event NettingApproved(uint256 indexed proposalId, address indexed signer);
    event NettingExecuted(uint256 indexed proposalId, bytes32 fiscalHash);
    event NettingRejected(uint256 indexed proposalId, address indexed rejectedBy);

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    modifier nonReentrant() {
        require(reentrancyStatus != ENTERED, "NettingEngine: reentrant call");
        reentrancyStatus = ENTERED;
        _;
        reentrancyStatus = NOT_ENTERED;
    }

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor(address _obligationRegistry, address _auditLog) {
        require(_obligationRegistry != address(0), "NettingEngine: zero registry");
        require(_auditLog != address(0), "NettingEngine: zero auditLog");

        obligationRegistry = IObligationRegistry(_obligationRegistry);
        auditLog = IAuditLog(_auditLog);

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes("ClearLoop NettingEngine")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    // ---------------------------------------------------------------------
    // Propuesta de netting
    // ---------------------------------------------------------------------

    /// @notice Recibe un ciclo de obligationIds del solver offchain y lo
    ///         valida on-chain antes de aceptarlo como propuesta.
    /// @dev Permissionless a propósito: cualquiera puede proponer un ciclo,
    ///      pero solo se ejecuta si las partes reales firman. El costo de
    ///      spam es gas del proponente, no riesgo económico del sistema.
    function proposeNetting(bytes32[] calldata cycleIds) external returns (uint256 proposalId) {
        uint256 len = cycleIds.length;
        require(len >= MIN_CYCLE_LENGTH, "NettingEngine: cycle too short");
        require(len <= MAX_CYCLE_LENGTH, "NettingEngine: cycle too long");

        _requireNoDuplicates(cycleIds);

        (address[] memory participants, uint256 participantCount, uint256 totalAmount) =
            _validateCycle(cycleIds);

        proposalId = ++proposalCount;

        Proposal storage p = proposals[proposalId];
        p.cycleIds = cycleIds;
        p.totalAmount = totalAmount;
        p.deadline = block.timestamp + PROPOSAL_WINDOW;
        p.status = ProposalStatus.Pending;

        for (uint256 i = 0; i < participantCount; i++) {
            p.participants.push(participants[i]);
        }

        emit NettingProposed(proposalId, cycleIds, p.deadline);
    }

    /// @dev Valida Sigma-Delta=0 con signo derivado de creditor/debtor, en una
    ///      sola pasada de llamadas externas (O(N), no O(N^2)). También aplica
    ///      la Decisión #8: en el MVP todos los montos del ciclo deben ser
    ///      exactamente iguales (sin novación de saldos residuales).
    function _validateCycle(bytes32[] calldata cycleIds)
        internal
        view
        returns (address[] memory participants, uint256 participantCount, uint256 totalAmount)
    {
        uint256 len = cycleIds.length;
        participants = new address[](len * 2);
        int256[] memory netPositions = new int256[](len * 2);
        participantCount = 0;
        uint256 firstAmount;

        for (uint256 i = 0; i < len; i++) {
            (address creditor, address debtor, uint256 amount) =
                obligationRegistry.getObligationForNetting(cycleIds[i]);

            require(amount <= uint256(type(int256).max), "NettingEngine: amount overflow");

            if (i == 0) {
                firstAmount = amount;
            } else {
                require(amount == firstAmount, "NettingEngine: amounts must match in MVP");
            }

            totalAmount += amount;

            int256 signedAmount = int256(amount);
            participantCount = _applyDelta(participants, netPositions, participantCount, creditor, signedAmount);
            participantCount = _applyDelta(participants, netPositions, participantCount, debtor, -signedAmount);
        }

        for (uint256 i = 0; i < participantCount; i++) {
            require(netPositions[i] == 0, "NettingEngine: cycle does not balance");
        }
    }

    function _applyDelta(
        address[] memory participants,
        int256[] memory netPositions,
        uint256 count,
        address addr,
        int256 delta
    ) private pure returns (uint256) {
        for (uint256 i = 0; i < count; i++) {
            if (participants[i] == addr) {
                netPositions[i] += delta;
                return count;
            }
        }
        participants[count] = addr;
        netPositions[count] = delta;
        return count + 1;
    }

    function _requireNoDuplicates(bytes32[] calldata cycleIds) internal pure {
        uint256 len = cycleIds.length;
        for (uint256 i = 0; i < len; i++) {
            for (uint256 j = i + 1; j < len; j++) {
                require(cycleIds[i] != cycleIds[j], "NettingEngine: duplicate obligation in cycle");
            }
        }
    }

    // ---------------------------------------------------------------------
    // Firmas EIP-712
    // ---------------------------------------------------------------------

    /// @notice Registra la aprobación de un participante mediante firma
    ///         EIP-712 off-chain (patrón permit-style: signer + nonce
    ///         explícitos, para que el nonce se valide antes de conocer
    ///         quién firmó realmente).
    function approveProposal(
        uint256 proposalId,
        address signer,
        uint256 nonce,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        Proposal storage p = proposals[proposalId];
        require(p.status == ProposalStatus.Pending, "NettingEngine: proposal not pending");
        require(block.timestamp <= p.deadline, "NettingEngine: proposal expired");
        require(block.timestamp <= deadline, "NettingEngine: signature expired");
        require(nonce == nonces[signer], "NettingEngine: invalid nonce");
        require(!hasApproved[proposalId][signer], "NettingEngine: already approved");
        require(_isParticipant(p, signer), "NettingEngine: signer not a participant");

        bytes32 structHash = keccak256(
            abi.encode(APPROVE_TYPEHASH, proposalId, signer, nonce, deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address recovered = ecrecover(digest, v, r, s);
        require(recovered != address(0) && recovered == signer, "NettingEngine: invalid signature");

        nonces[signer] = nonce + 1;
        hasApproved[proposalId][signer] = true;
        p.approvalCount += 1;

        emit NettingApproved(proposalId, signer);
    }

    function _isParticipant(Proposal storage p, address addr) internal view returns (bool) {
        uint256 len = p.participants.length;
        for (uint256 i = 0; i < len; i++) {
            if (p.participants[i] == addr) return true;
        }
        return false;
    }

    // ---------------------------------------------------------------------
    // Ejecución atómica
    // ---------------------------------------------------------------------

    /// @notice Función crítica: consume las obligaciones del ciclo y las
    ///         marca liquidadas, todo en una sola transacción atómica.
    /// @dev Checks-Effects-Interactions: el status se marca Executed ANTES
    ///      de las llamadas externas — si algo intenta reentrar, encuentra
    ///      status != Pending y revierte en el primer require. El modifier
    ///      nonReentrant es una segunda capa de defensa, no la única.
    function archiveAndNovate(uint256 proposalId) external nonReentrant {
        Proposal storage p = proposals[proposalId];
        require(p.status == ProposalStatus.Pending, "NettingEngine: proposal not pending");
        require(block.timestamp <= p.deadline, "NettingEngine: proposal expired");
        require(p.approvalCount == p.participants.length, "NettingEngine: missing approvals");

        p.status = ProposalStatus.Executed;

        uint256 len = p.cycleIds.length;
        for (uint256 i = 0; i < len; i++) {
            obligationRegistry.markSettled(p.cycleIds[i]);
        }

        bytes32 fiscalHash = keccak256(abi.encode(proposalId, block.chainid, block.timestamp));
        auditLog.logExtinction(p.totalAmount, fiscalHash);

        emit NettingExecuted(proposalId, fiscalHash);
    }

    /// @notice Cualquier participante puede rechazar antes de la ejecución.
    ///         Las obligaciones originales quedan intactas.
    function rejectProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(p.status == ProposalStatus.Pending, "NettingEngine: proposal not pending");
        require(_isParticipant(p, msg.sender), "NettingEngine: not a participant");
        p.status = ProposalStatus.Rejected;
        emit NettingRejected(proposalId, msg.sender);
    }

    // ---------------------------------------------------------------------
    // Lectura
    // ---------------------------------------------------------------------

    function getProposal(uint256 proposalId)
        external
        view
        returns (
            bytes32[] memory cycleIds,
            address[] memory participants,
            uint256 totalAmount,
            uint256 approvalCount,
            uint256 deadline,
            ProposalStatus status
        )
    {
        Proposal storage p = proposals[proposalId];
        return (p.cycleIds, p.participants, p.totalAmount, p.approvalCount, p.deadline, p.status);
    }
}
