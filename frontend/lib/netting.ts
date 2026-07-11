import type { Obligation, CycleValidation } from "./types"

/**
 * Deterministic pseudo-hash for mock IDs (bytes32-looking).
 * Real contracts use keccak256; this only needs to be stable + unique
 * for the in-memory demo.
 */
export function pseudoHash(...parts: (string | number)[]): string {
  const input = parts.join("|")
  // djb2 over the string, expanded into 64 hex chars.
  let h1 = 5381
  let h2 = 52711
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i)
    h1 = (h1 * 33) ^ c
    h2 = (h2 * 33) ^ (c + 7)
  }
  const seed = (Math.abs(h1) >>> 0).toString(16) + (Math.abs(h2) >>> 0).toString(16)
  let out = ""
  let acc = seed
  while (out.length < 64) {
    acc = (Math.abs(hashStr(acc)) >>> 0).toString(16).padStart(8, "0") + acc
    out = (out + acc).replace(/[^0-9a-f]/g, "0")
  }
  return "0x" + out.slice(0, 64)
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return h
}

/** Shorten an address / hash for display: 0x1234…abcd */
export function shortHex(hex: string, lead = 6, tail = 4): string {
  if (!hex || hex.length <= lead + tail) return hex
  return `${hex.slice(0, lead)}…${hex.slice(-tail)}`
}

/**
 * Off-chain mirror of NettingEngine._validateCycle:
 * derives each participant's signed net position (+amount for creditor,
 * -amount for debtor) and checks Σ∆ = 0. Also enforces Decision #8
 * (all amounts equal in the MVP).
 */
export function validateCycle(cycleIds: string[], all: Obligation[]): CycleValidation {
  const byId = new Map(all.map((o) => [o.id, o]))
  const obligations = cycleIds.map((id) => byId.get(id)).filter(Boolean) as Obligation[]

  if (obligations.length !== cycleIds.length) {
    return { balances: [], balanced: false, amountsMatch: false, totalAmount: 0, reason: "obligation not found" }
  }
  if (obligations.length < 2) {
    return { balances: [], balanced: false, amountsMatch: false, totalAmount: 0, reason: "cycle too short" }
  }

  const net = new Map<string, number>()
  let total = 0
  const firstAmount = obligations[0].amount
  let amountsMatch = true

  for (const o of obligations) {
    if (o.amount !== firstAmount) amountsMatch = false
    total += o.amount
    net.set(o.creditor, (net.get(o.creditor) ?? 0) + o.amount)
    net.set(o.debtor, (net.get(o.debtor) ?? 0) - o.amount)
  }

  const balances = [...net.entries()].map(([address, n]) => ({ address, net: n }))
  const balanced = balances.every((b) => b.net === 0)

  let reason: string | undefined
  if (!balanced) reason = "cycle does not balance (Σ∆ ≠ 0)"
  else if (!amountsMatch) reason = "amounts must match in MVP"

  return { balances, balanced, amountsMatch, totalAmount: total, reason }
}

/**
 * Naive cycle finder for the demo "solver": returns the first simple
 * cycle of unsettled, equal-amount obligations it can find. Mirrors what
 * scripts/solver/solver.py produces off-chain, then hands to the engine.
 */
export function findNettableCycle(all: Obligation[]): string[] | null {
  const active = all.filter((o) => !o.settled)
  // Group edges by debtor -> list of obligations (debtor owes creditor)
  const outgoing = new Map<string, Obligation[]>()
  for (const o of active) {
    const list = outgoing.get(o.debtor) ?? []
    list.push(o)
    outgoing.set(o.debtor, list)
  }

  // DFS for a cycle where every hop has the same amount.
  for (const start of outgoing.keys()) {
    const path: Obligation[] = []
    const visited = new Set<string>()

    const dfs = (node: string, amount: number | null): boolean => {
      const edges = outgoing.get(node) ?? []
      for (const edge of edges) {
        if (amount !== null && edge.amount !== amount) continue
        // edge: node (debtor) owes edge.creditor
        if (edge.creditor === start && path.length >= 1) {
          path.push(edge)
          return true
        }
        if (visited.has(edge.creditor)) continue
        visited.add(edge.creditor)
        path.push(edge)
        if (dfs(edge.creditor, amount ?? edge.amount)) return true
        path.pop()
        visited.delete(edge.creditor)
      }
      return false
    }

    visited.add(start)
    if (dfs(start, null)) {
      return path.map((o) => o.id)
    }
  }
  return null
}
