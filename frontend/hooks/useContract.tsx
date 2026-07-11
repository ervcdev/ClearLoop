"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type {
  AuditRecord,
  Obligation,
  Proposal,
  Role,
} from "@/lib/types"
import { INITIAL_OBLIGATIONS, COMPANIES } from "@/lib/mock-data"
import { pseudoHash, validateCycle } from "@/lib/netting"

const PROPOSAL_WINDOW_MS = 3 * 24 * 60 * 60 * 1000 // 3 days (Decision: PROPOSAL_WINDOW)

interface ContractState {
  role: Role
  obligations: Obligation[]
  proposals: Proposal[]
  audit: AuditRecord[]
  nonces: Record<string, number>
}

interface ContractApi extends ContractState {
  setRole: (role: Role) => void
  /** Off-chain solver hands a cycle; engine re-validates Σ∆=0 on-chain. */
  proposeNetting: (cycleIds: string[]) => { ok: boolean; proposalId?: number; error?: string }
  /** Record an EIP-712 approval from a participant. */
  approveProposal: (proposalId: number, signer: string) => { ok: boolean; error?: string }
  /** Atomic extinction: mark obligations settled + write audit record. */
  executeProposal: (proposalId: number) => { ok: boolean; error?: string }
  rejectProposal: (proposalId: number, by: string) => { ok: boolean; error?: string }
  reset: () => void
}

const ClearLoopContext = createContext<ContractApi | null>(null)

function initialState(): ContractState {
  return {
    role: { kind: "company", address: COMPANIES[0].address },
    obligations: INITIAL_OBLIGATIONS.map((o) => ({ ...o })),
    proposals: [],
    audit: [],
    nonces: Object.fromEntries(COMPANIES.map((c) => [c.address, 0])),
  }
}

export function ClearLoopProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ContractState>(initialState)

  const setRole = useCallback((role: Role) => {
    setState((s) => ({ ...s, role }))
  }, [])

  const reset = useCallback(() => setState(initialState()), [])

  const proposeNetting = useCallback((cycleIds: string[]) => {
    let result: { ok: boolean; proposalId?: number; error?: string } = { ok: false }
    setState((s) => {
      const v = validateCycle(cycleIds, s.obligations)
      if (!v.balanced || !v.amountsMatch) {
        result = { ok: false, error: v.reason ?? "invalid cycle" }
        return s
      }
      const anySettled = cycleIds.some((id) => s.obligations.find((o) => o.id === id)?.settled)
      if (anySettled) {
        result = { ok: false, error: "obligation already settled" }
        return s
      }
      const participants = v.balances.map((b) => b.address)
      const id = s.proposals.length + 1
      const now = Date.now()
      const proposal: Proposal = {
        id,
        cycleIds,
        participants,
        totalAmount: v.totalAmount,
        approvals: [],
        deadline: now + PROPOSAL_WINDOW_MS,
        status: "Pending",
        createdAt: now,
      }
      result = { ok: true, proposalId: id }
      return { ...s, proposals: [...s.proposals, proposal] }
    })
    return result
  }, [])

  const approveProposal = useCallback((proposalId: number, signer: string) => {
    let result: { ok: boolean; error?: string } = { ok: false }
    setState((s) => {
      const idx = s.proposals.findIndex((p) => p.id === proposalId)
      if (idx === -1) return (result = { ok: false, error: "proposal not found" }), s
      const p = s.proposals[idx]
      if (p.status !== "Pending") return (result = { ok: false, error: "proposal not pending" }), s
      if (Date.now() > p.deadline) return (result = { ok: false, error: "proposal expired" }), s
      if (!p.participants.includes(signer)) return (result = { ok: false, error: "signer not a participant" }), s
      if (p.approvals.some((a) => a.signer === signer))
        return (result = { ok: false, error: "already approved" }), s

      const nonce = s.nonces[signer] ?? 0
      const proposals = [...s.proposals]
      proposals[idx] = {
        ...p,
        approvals: [...p.approvals, { signer, nonce, signedAt: Date.now() }],
      }
      result = { ok: true }
      return { ...s, proposals, nonces: { ...s.nonces, [signer]: nonce + 1 } }
    })
    return result
  }, [])

  const executeProposal = useCallback((proposalId: number) => {
    let result: { ok: boolean; error?: string } = { ok: false }
    setState((s) => {
      const idx = s.proposals.findIndex((p) => p.id === proposalId)
      if (idx === -1) return (result = { ok: false, error: "proposal not found" }), s
      const p = s.proposals[idx]
      if (p.status !== "Pending") return (result = { ok: false, error: "proposal not pending" }), s
      if (Date.now() > p.deadline) return (result = { ok: false, error: "proposal expired" }), s
      if (p.approvals.length !== p.participants.length)
        return (result = { ok: false, error: "missing approvals" }), s

      // Checks-effects-interactions: flip status first (mirror of contract).
      const proposals = [...s.proposals]
      proposals[idx] = { ...p, status: "Executed" }

      const cycleSet = new Set(p.cycleIds)
      const obligations = s.obligations.map((o) =>
        cycleSet.has(o.id) ? { ...o, settled: true } : o,
      )

      const fiscalHash = pseudoHash(proposalId, "chain", Date.now())
      const record: AuditRecord = {
        txId: s.audit.length + 1,
        kind: "Extinction",
        totalAmount: p.totalAmount,
        fiscalHash,
        timestamp: Date.now(),
      }
      result = { ok: true }
      return { ...s, proposals, obligations, audit: [...s.audit, record] }
    })
    return result
  }, [])

  const rejectProposal = useCallback((proposalId: number, by: string) => {
    let result: { ok: boolean; error?: string } = { ok: false }
    setState((s) => {
      const idx = s.proposals.findIndex((p) => p.id === proposalId)
      if (idx === -1) return (result = { ok: false, error: "proposal not found" }), s
      const p = s.proposals[idx]
      if (p.status !== "Pending") return (result = { ok: false, error: "proposal not pending" }), s
      if (!p.participants.includes(by)) return (result = { ok: false, error: "not a participant" }), s
      const proposals = [...s.proposals]
      proposals[idx] = { ...p, status: "Rejected" }
      result = { ok: true }
      return { ...s, proposals }
    })
    return result
  }, [])

  const value = useMemo<ContractApi>(
    () => ({
      ...state,
      setRole,
      proposeNetting,
      approveProposal,
      executeProposal,
      rejectProposal,
      reset,
    }),
    [state, setRole, proposeNetting, approveProposal, executeProposal, rejectProposal, reset],
  )

  return <ClearLoopContext.Provider value={value}>{children}</ClearLoopContext.Provider>
}

export function useContract(): ContractApi {
  const ctx = useContext(ClearLoopContext)
  if (!ctx) throw new Error("useContract must be used within ClearLoopProvider")
  return ctx
}
