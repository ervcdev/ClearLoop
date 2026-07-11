"use client"

import { useState } from "react"
import { useContract } from "@/hooks/useContract"
import { findNettableCycle } from "@/lib/netting"
import { companyName } from "@/lib/mock-data"
import { RoleSwitcher } from "@/components/RoleSwitcher"
import { ObligationGraph } from "@/components/ObligationGraph"
import { ObligationList } from "@/components/ObligationList"
import { AuditTable } from "@/components/AuditTable"
import { NettingModal } from "@/components/NettingModal"
import { StatusBadge } from "@/components/StatusBadge"

export function Dashboard() {
  const {
    role,
    obligations,
    proposals,
    audit,
    proposeNetting,
    reset,
  } = useContract()

  const [openProposal, setOpenProposal] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const me = role.kind === "company" ? role.address : null
  const activeProposal = proposals.find((p) => p.status === "Pending")
  const highlightIds = activeProposal?.cycleIds ?? []

  const myObligations = me ? obligations.filter((o) => o.creditor === me || o.debtor === me) : []
  const receivables = myObligations.filter((o) => o.creditor === me && !o.settled).reduce((s, o) => s + o.amount, 0)
  const payables = myObligations.filter((o) => o.debtor === me && !o.settled).reduce((s, o) => s + o.amount, 0)

  const grossOpen = obligations.filter((o) => !o.settled).reduce((s, o) => s + o.amount, 0)
  const extinguished = audit.reduce((s, r) => s + r.totalAmount, 0)

  const runSolver = () => {
    setNotice(null)
    const cycle = findNettableCycle(obligations)
    if (!cycle) {
      setNotice("Solver found no balanced, equal-amount cycle in the open obligations.")
      return
    }
    const existing = proposals.find(
      (p) => p.status === "Pending" && p.cycleIds.length === cycle.length && p.cycleIds.every((id) => cycle.includes(id)),
    )
    if (existing) {
      setOpenProposal(existing.id)
      return
    }
    const r = proposeNetting(cycle)
    if (r.ok && r.proposalId) setOpenProposal(r.proposalId)
    else setNotice(r.error ?? "Proposal failed on-chain validation.")
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M17 2.1l4 4-4 4" />
              <path d="M3 12.6v-2a4 4 0 0 1 4-4h14" />
              <path d="M7 21.9l-4-4 4-4" />
              <path d="M21 11.4v2a4 4 0 0 1-4 4H3" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-none">ClearLoop</h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Multilateral debt compression
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runSolver}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Run solver
          </button>
          <button
            type="button"
            onClick={() => {
              reset()
              setNotice(null)
              setOpenProposal(null)
            }}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Reset
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        {/* Sidebar */}
        <aside className="flex flex-col gap-6">
          <section className="rounded-lg border border-border bg-card p-4">
            <RoleSwitcher />
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {role.kind === "regulator" ? "Network aggregate" : "Your position"}
            </h2>
            {role.kind === "regulator" ? (
              <dl className="flex flex-col gap-3">
                <Stat label="Gross open notional" value={grossOpen} />
                <Stat label="Extinguished to date" value={extinguished} accent />
                <Stat label="Audit records" value={audit.length} raw />
              </dl>
            ) : (
              <dl className="flex flex-col gap-3">
                <Stat label="Receivables" value={receivables} accent />
                <Stat label="Payables" value={payables} />
                <Stat label="Net position" value={receivables - payables} signed />
              </dl>
            )}
          </section>
        </aside>

        {/* Main */}
        <main className="flex flex-col gap-6">
          {notice && (
            <p className="rounded-md border border-border bg-muted/60 px-4 py-2.5 text-sm text-muted-foreground">
              {notice}
            </p>
          )}

          {/* Graph */}
          <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Obligation network</h2>
              <span className="font-mono text-[11px] text-muted-foreground">
                {role.kind === "regulator" ? "aggregate view" : `as ${companyName(me!)}`}
              </span>
            </div>
            {role.kind === "regulator" ? (
              <p className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                The obligation graph is confidential. Regulators observe only the
                aggregate audit ledger below.
              </p>
            ) : (
              <ObligationGraph obligations={obligations} role={role} highlightIds={highlightIds} />
            )}
          </section>

          {/* Proposals */}
          {proposals.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
              <h2 className="mb-3 text-sm font-semibold">Netting proposals</h2>
              <ul className="flex flex-col gap-2">
                {proposals.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setOpenProposal(p.id)}
                      className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2.5 text-left transition-colors hover:border-primary/40"
                    >
                      <span className="font-mono text-xs text-muted-foreground">#{p.id}</span>
                      <span className="text-sm">
                        {p.cycleIds.length} obligations · {p.totalAmount.toLocaleString()} notional
                      </span>
                      <span className="ml-auto flex items-center gap-3">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {p.approvals.length}/{p.participants.length} signed
                        </span>
                        <StatusBadge status={p.status} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Obligations / Audit */}
          <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
            <h2 className="mb-3 text-sm font-semibold">
              {role.kind === "regulator" ? "Audit ledger" : "Your obligations"}
            </h2>
            {role.kind === "regulator" ? (
              <AuditTable records={audit} />
            ) : (
              <ObligationList obligations={obligations} me={me!} />
            )}
          </section>
        </main>
      </div>

      {openProposal !== null && (
        <NettingModal proposalId={openProposal} onClose={() => setOpenProposal(null)} />
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
  signed,
  raw,
}: {
  label: string
  value: number
  accent?: boolean
  signed?: boolean
  raw?: boolean
}) {
  const display = raw
    ? value.toString()
    : signed
      ? `${value > 0 ? "+" : ""}${value.toLocaleString()}`
      : value.toLocaleString()
  return (
    <div className="flex items-center justify-between">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`font-mono text-sm font-medium ${accent ? "text-primary" : ""}`}>{display}</dd>
    </div>
  )
}
