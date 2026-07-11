import type { Company, Obligation } from "./types"
import { pseudoHash } from "./netting"

export const COMPANIES: Company[] = [
  { address: "0xA1fa0000000000000000000000000000000000A1", name: "Alfa Manufacturing", short: "AL" },
  { address: "0xB2ea0000000000000000000000000000000000B2", name: "Beta Logistics", short: "BE" },
  { address: "0x6a3a0000000000000000000000000000000000C3", name: "Gamma Foods", short: "GA" },
  { address: "0xDe17a00000000000000000000000000000000D14", name: "Delta Textiles", short: "DE" },
]

export function companyByAddress(address: string): Company | undefined {
  return COMPANIES.find((c) => c.address.toLowerCase() === address.toLowerCase())
}

export function companyName(address: string): string {
  return companyByAddress(address)?.name ?? address
}

// A balanced 3-cycle of equal amounts (Alfa → Beta → Gamma → Alfa),
// plus two residual obligations that are NOT nettable in the MVP.
// Convention: creditor is owed `amount` by debtor.
function ob(creditorIdx: number, debtorIdx: number, amount: number, salt: string): Obligation {
  const creditor = COMPANIES[creditorIdx].address
  const debtor = COMPANIES[debtorIdx].address
  return {
    id: pseudoHash(creditor, debtor, amount, salt),
    creditor,
    debtor,
    amount,
    settled: false,
  }
}

export const INITIAL_OBLIGATIONS: Obligation[] = [
  // The nettable cycle — 50,000 each, Σ∆ = 0.
  ob(1, 0, 50000, "s1"), // Beta is owed 50k by Alfa
  ob(2, 1, 50000, "s2"), // Gamma is owed 50k by Beta
  ob(0, 2, 50000, "s3"), // Alfa is owed 50k by Gamma
  // Residual obligations (unequal amounts / not part of the cycle).
  ob(0, 3, 30000, "s4"), // Alfa is owed 30k by Delta
  ob(3, 1, 20000, "s5"), // Delta is owed 20k by Beta
]
