// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IObligationRegistry {
    function getObligationForNetting(bytes32 id)
        external
        view
        returns (address creditor, address debtor, uint256 amount);

    function markSettled(bytes32 id) external;
}

interface IAuditLog {
    function logExtinction(uint256 amount, bytes32 fiscalHash) external;
}
