// Domain model mirrored from the Solidity contracts
// (ObligationRegistry.sol, NettingEngine.sol, AuditLog.sol).
// All amounts are integers (no residuals in MVP — Decision #8).

/** A participating company. `address` is its on-chain identity. */
export interface Company {
  address: string // 0x… EVM address
  name: string
  short: string // 2-letter tag for graph nodes
}

/**
 * Bilateral obligation. `creditor` is owed `amount` by `debtor`.
 * `id` is the deterministic keccak256(creditor, debtor, amount, salt).
 */
export interface Obligation {
  id: string // bytes32
  creditor: string // address
  debtor: string // address
  amount: number
  settled: boolean
}

export type ProposalStatus = "Pending" | "Executed" | "Rejected"

/** An approval recorded via EIP-712 signature (permit-style). */
export interface Approval {
  signer: string // address
  nonce: number
  signedAt: number // unix ms
}

/**
 * A netting proposal — a cycle of obligations whose signed net
 * positions sum to zero (Σ∆ = 0), validated on-chain.
 */
export interface Proposal {
  id: number
  cycleIds: string[]
  participants: string[]
  totalAmount: number
  approvals: Approval[]
  deadline: number // unix ms
  status: ProposalStatus
  createdAt: number
}

/**
 * AuditLog entry. Aggregate data only — never creditor/debtor.
 * This is exactly what the regulator role is allowed to see.
 */
export interface AuditRecord {
  txId: number
  kind: "Extinction"
  totalAmount: number
  fiscalHash: string // bytes32
  timestamp: number
}

export type Role =
  | { kind: "company"; address: string }
  | { kind: "regulator" }

/** Result of the off-chain Σ∆=0 validation (mirror of _validateCycle). */
export interface CycleValidation {
  balances: { address: string; net: number }[]
  balanced: boolean
  amountsMatch: boolean
  totalAmount: number
  reason?: string
}
