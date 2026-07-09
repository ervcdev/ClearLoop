// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AuditLog
/// @notice Registro inmutable de compliance. Solo recibe montos agregados y
///         hashes fiscales — nunca creditor, debtor, ni identificadores de
///         empresa. Ver PROJECT.md sección 4.3.
contract AuditLog {
    struct AuditEntry {
        uint256 timestamp;
        uint256 amount;
        bytes32 fiscalHash;
    }

    address public immutable owner;
    address public nettingEngine;

    AuditEntry[] private entries;

    event ExtinctionLogged(uint256 indexed entryIndex, uint256 amount, bytes32 fiscalHash, uint256 timestamp);
    event NettingEngineSet(address indexed engine);

    modifier onlyOwner() {
        require(msg.sender == owner, "AuditLog: not owner");
        _;
    }

    modifier onlyNettingEngine() {
        require(msg.sender == nettingEngine, "AuditLog: not NettingEngine");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Setter de un solo uso — mismo patrón que ObligationRegistry
    ///         (Decisión #2 y #12 del log).
    function setNettingEngine(address _engine) external onlyOwner {
        require(nettingEngine == address(0), "AuditLog: already set");
        require(_engine != address(0), "AuditLog: zero address");
        nettingEngine = _engine;
        emit NettingEngineSet(_engine);
    }

    function logExtinction(uint256 amount, bytes32 fiscalHash) external onlyNettingEngine {
        entries.push(AuditEntry({timestamp: block.timestamp, amount: amount, fiscalHash: fiscalHash}));
        emit ExtinctionLogged(entries.length - 1, amount, fiscalHash, block.timestamp);
    }

    function getAuditTrail() external view returns (AuditEntry[] memory) {
        return entries;
    }

    function getAuditTrailLength() external view returns (uint256) {
        return entries.length;
    }
}
