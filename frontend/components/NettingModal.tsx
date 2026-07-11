"use client"

import { useEffect, useState } from "react"
import { useContract } from "@/hooks/useContract"
import { companyName } from "@/lib/mock-data"
import { shortHex, validateCycle } from "@/lib/netting"
import { StatusBadge } from "@/components/StatusBadge"

export function NettingModal({
  proposalId,
  onClose,
}: {
  proposalId: number
  onClose: () => void
}) {
  const { proposals, obligations, role, approveProposal, executeProposal, rejectProposal } =
    useContract()
  const proposal = proposals.find((p) => p.id === proposalId)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  if (!proposal) return null

  const validation = validateCycle(proposal.cycleIds, obligations)
  const me = role.kind === "company" ? role.address : null
  const iAmParticipant = me !== null && proposal.participants.includes(me)
  const iApproved = me !== null && proposal.approvals.some((a) => a.signer === me)
  const allApproved = proposal.approvals.length === proposal.participants.length
  const cycleObligations = proposal.cycleIds
    .map((id) => obligations.find((o) => o.id === id))
    .filter(Boolean)

  const act = (fn: () => { ok: boolean; error?: string }) => {
    const r = fn()
    setError(r.ok ? null : (r.error ?? "action failed"))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Netting proposal #${proposal.id}`}
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-lg border border-border bg-card shadow-xl sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-mono text-sm font-semibold">Proposal #{proposal.id}</h2>
              <StatusBadge status={proposal.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Atomic extinction of a balanced obligation cycle
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Σ∆ validation */}
        <div className="border-b border-border p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              On-chain balance check · Σ∆
            </span>
            <span
              className={`font-mono text-xs font-medium ${
                validation.balanced && validation.amountsMatch ? "text-settled" : "text-rejected"
              }`}
            >
              {validation.balanced && validation.amountsMatch ? "Σ∆ = 0 ✓" : validation.reason}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {validation.balances.map((b) => (
              <div
                key={b.address}
                className="flex items-center justify-between rounded-md bg-muted px-3 py-2"
              >
                <span className="truncate text-xs">{companyName(b.address)}</span>
                <span className="font-mono text-xs font-medium">
                  {b.net === 0 ? "0" : b.net > 0 ? `+${b.net.toLocaleString()}` : b.net.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cycle obligations */}
        <div className="border-b border-border p-5">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Cycle · {cycleObligations.length} obligations · notional{" "}
            {proposal.totalAmount.toLocaleString()}
          </div>
          <ul className="flex flex-col gap-2">
            {cycleObligations.map((o) => (
              <li key={o!.id} className="flex items-center gap-2 text-sm">
                <span className="truncate">{companyName(o!.debtor)}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-muted-foreground">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                <span className="truncate">{companyName(o!.creditor)}</span>
                <span className="ml-auto shrink-0 font-mono text-xs">{o!.amount.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Signatures */}
        <div className="border-b border-border p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              EIP-712 approvals
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {proposal.approvals.length}/{proposal.participants.length}
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {proposal.participants.map((addr) => {
              const approval = proposal.approvals.find((a) => a.signer === addr)
              return (
                <li key={addr} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      approval ? "bg-settled text-settled-foreground" : "bg-muted text-muted-foreground"
                    }`}
                    aria-hidden
                  >
                    {approval ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <span className="truncate">{companyName(addr)}</span>
                  <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                    {approval ? `nonce ${approval.nonce} · signed` : "awaiting"}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 p-5">
          {error && proposal.status === "Pending" && (
            <p className="rounded-md bg-rejected/10 px-3 py-2 font-mono text-xs text-rejected">
              {error}
            </p>
          )}

          {proposal.status === "Pending" ? (
            <div className="flex flex-col gap-2">
              {iAmParticipant ? (
                <button
                  type="button"
                  disabled={iApproved}
                  onClick={() => act(() => approveProposal(proposal.id, me!))}
                  className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {iApproved ? "You have signed" : `Sign as ${companyName(me!)}`}
                </button>
              ) : (
                <p className="rounded-md bg-muted px-3 py-2.5 text-center text-xs text-muted-foreground">
                  {role.kind === "regulator"
                    ? "Regulators cannot sign — read-only role."
                    : "You are not a participant in this cycle."}
                </p>
              )}

              <button
                type="button"
                disabled={!allApproved}
                onClick={() => act(() => executeProposal(proposal.id))}
                className="w-full rounded-md border border-primary px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground"
              >
                {allApproved ? "Execute atomic netting" : `Awaiting ${proposal.participants.length - proposal.approvals.length} signature(s)`}
              </button>

              {iAmParticipant && (
                <button
                  type="button"
                  onClick={() => act(() => rejectProposal(proposal.id, me!))}
                  className="w-full rounded-md px-4 py-2 text-xs font-medium text-rejected transition-colors hover:bg-rejected/10"
                >
                  Reject proposal
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-md bg-muted px-3 py-2.5 text-center text-sm text-muted-foreground">
              {proposal.status === "Executed"
                ? "Cycle extinguished atomically. Obligations marked settled."
                : "Proposal rejected. Original obligations remain intact."}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
