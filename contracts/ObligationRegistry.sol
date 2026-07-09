// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IObligationRegistry} from "./interfaces/IClearLoop.sol";

/// @title ObligationRegistry
/// @notice Registro de obligaciones bilaterales con IDs determinísticos
///         (bytes32). NettingEngine es la única entidad autorizada para
///         marcar obligaciones como liquidadas.
/// @dev v2 — fixes de auditoría aplicados: IDs bytes32 determinísticos,
///      setNettingEngine de un solo uso, defensa en profundidad contra
///      duplicados.
contract ObligationRegistry is IObligationRegistry {
    struct Obligation {
        address creditor;
        address debtor;
        uint256 amount;
        bool settled;
    }

    address public immutable owner;
    address public nettingEngine;

    mapping(bytes32 => Obligation) private _obligations;
    bytes32[] private _obligationIds;

    event ObligationRegistered(bytes32 indexed obligationId, address indexed creditor, address indexed debtor, uint256 amount);
    event ObligationSettled(bytes32 indexed obligationId);
    event NettingEngineSet(address indexed engine);

    modifier onlyOwner() {
        require(msg.sender == owner, "ObligationRegistry: not owner");
        _;
    }

    modifier onlyNettingEngine() {
        require(msg.sender == nettingEngine, "ObligationRegistry: not NettingEngine");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Setter de un solo uso — mismo patrón que AuditLog.
    ///         Una vez seteado, NettingEngine no se puede cambiar.
    function setNettingEngine(address _engine) external onlyOwner {
        require(nettingEngine == address(0), "ObligationRegistry: already set");
        require(_engine != address(0), "ObligationRegistry: zero address");
        nettingEngine = _engine;
        emit NettingEngineSet(_engine);
    }

    /// @notice Registra una obligación donde msg.sender es el creditor.
    /// @param debtor Dirección del deudor
    /// @param amount Monto de la obligación
    /// @param salt Nonce aleatorio para generar un ID determinístico único
    /// @return obligationId keccak256(creditor, debtor, amount, salt)
    function submitObligation(address debtor, uint256 amount, bytes32 salt) external returns (bytes32 obligationId) {
        require(debtor != address(0), "ObligationRegistry: zero debtor");
        require(msg.sender != debtor, "ObligationRegistry: self-obligation");
        require(amount > 0, "ObligationRegistry: zero amount");

        obligationId = keccak256(abi.encode(msg.sender, debtor, amount, salt));
        require(_obligations[obligationId].creditor == address(0), "ObligationRegistry: duplicate");

        _obligations[obligationId] = Obligation({
            creditor: msg.sender,
            debtor: debtor,
            amount: amount,
            settled: false
        });
        _obligationIds.push(obligationId);

        emit ObligationRegistered(obligationId, msg.sender, debtor, amount);
    }

    /// @notice Devuelve los datos que NettingEngine necesita para validar un ciclo.
    /// @dev Revierte si la obligación no existe. No revela settled status
    ///      intencionalmente — NettingEngine lo verifica aparte si necesita.
    function getObligationForNetting(bytes32 id)
        external
        view
        returns (address creditor, address debtor, uint256 amount)
    {
        Obligation storage ob = _obligations[id];
        require(ob.creditor != address(0), "ObligationRegistry: not found");
        return (ob.creditor, ob.debtor, ob.amount);
    }

    /// @notice Marca una obligación como liquidada. Solo NettingEngine.
    /// @dev Trust boundary: NettingEngine debe validar Σ∆=0 y firmas
    ///      ANTES de llamar esta función.
    function markSettled(bytes32 id) external onlyNettingEngine {
        Obligation storage ob = _obligations[id];
        require(ob.creditor != address(0), "ObligationRegistry: not found");
        require(!ob.settled, "ObligationRegistry: already settled");
        ob.settled = true;
        emit ObligationSettled(id);
    }

    /// @notice Obtiene el estado completo de una obligación (solo para
    ///         consulta — NettingEngine usa getObligationForNetting).
    function getObligation(bytes32 id) external view returns (Obligation memory) {
        require(_obligations[id].creditor != address(0), "ObligationRegistry: not found");
        return _obligations[id];
    }

    /// @notice Número total de obligaciones registradas.
    function obligationCount() external view returns (uint256) {
        return _obligationIds.length;
    }
}
