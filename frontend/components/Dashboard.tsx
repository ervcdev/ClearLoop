"use client"

import { useState } from "react"
import { useContract } from "@/hooks/useContract"
import { findNettableCycle } from "@/lib/netting"
import { companyName, COMPANIES } from "@/lib/mock-data"
import { RoleSwitcher } from "@/components/RoleSwitcher"
import { StatusRail } from "@/components/StatusRail"
import { ObligationGraph } from "@/components/ObligationGraph"
import { ObligationList } from "@/components/ObligationList"
import { AuditTable } from "@/components/AuditTable"
import { NettingModal } from "@/components/NettingModal"
import { StatusBadge } from "@/components/StatusBadge"
import { MetricsBar } from "@/components/MetricsBar"
import { DemoGuide } from "@/components/DemoGuide"

export function Dashboard() {
  const { role, obligations, proposals, audit, proposeNetting, reset } = useContract()

  const [openProposal, setOpenProposal] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const me = role.kind === "company" ? role.address : null
  const activeProposal = proposals.find((p) => p.status === "Pending")
  const highlightIds = activeProposal?.cycleIds ?? []

  const myObligations = me ? obligations.filter((o) => o.creditor === me || o.debtor === me) : []
  const receivables = myObligations.filter((o) => o.creditor === me && !o.settled).reduce((s, o) => s + o.amount, 0)
  const payables = myObligations.filter((o) => o.debtor === me && !o.settled).reduce((s, o) => s + o.amount, 0)
  const net = receivables - payables

  const grossOpen = obligations.filter((o) => !o.settled).reduce((s, o) => s + o.amount, 0)
  const extinguished = audit.reduce((s, r) => s + r.totalAmount, 0)
  const compression = grossOpen + extinguished > 0 ? Math.round((extinguished / (grossOpen + extinguished)) * 100) : 0

  const metrics =
    role.kind === "regulator"
      ? [
          { label: "Gross open notional", value: grossOpen.toLocaleString(), hint: "Across all counterparties" },
          { label: "Extinguished to date", value: extinguished.toLocaleString(), accent: "primary" as const, hint: `${audit.length} atomic event(s)` },
          { label: "Compression ratio", value: `${compression}%`, accent: "primary" as const, hint: "Gross debt removed" },
        ]
      : [
          { label: "Receivables", value: receivables.toLocaleString(), accent: "primary" as const, hint: "Owed to you (open)" },
          { label: "Payables", value: payables.toLocaleString(), hint: "You owe (open)" },
          {
            label: "Net position",
            value: `${net > 0 ? "+" : ""}${net.toLocaleString()}`,
            accent: net > 0 ? ("signed-pos" as const) : net < 0 ? ("signed-neg" as const) : ("neutral" as const),
            hint: "Receivables − payables",
          },
        ]

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
    <>
      <StatusRail parties={COMPANIES.length} />
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M17 2.1l4 4-4 4" />
              <path d="M3 12.6v-2a4 4 0 0 1 4-4h14" />
              <path d="M7 21.9l-4-4 4-4" />
              <path d="M21 11.4v2a4 4 0 0 1-4 4H3" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-none tracking-tight">ClearLoop</h1>
            <p className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Multilateral debt compression
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runSolver}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
            className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Headline KPIs — the compression story at a glance */}
      <div className="mb-6">
        <MetricsBar metrics={metrics} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        {/* Sidebar */}
        <aside className="flex flex-col gap-6">
          <section className="rounded-lg border border-border bg-card p-4">
            <RoleSwitcher />
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <DemoGuide
              hasProposal={!!activeProposal}
              signed={activeProposal?.approvals.length ?? 0}
              total={activeProposal?.participants.length ?? 0}
              extinctions={audit.length}
            />
          </section>
        </aside>

        {/* Main */}
        <main className="flex flex-col gap-6">
          {notice && (
            <p className="rounded-md border border-border bg-muted/60 px-4 py-2.5 text-sm text-muted-foreground">
              {notice}
            </p>
          )}

          {/* Graph — hero */}
          <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Obligation network</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {role.kind === "regulator"
                    ? "Confidential — not visible to regulators"
                    : "You only see obligations you are party to"}
                </p>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">
                {role.kind === "regulator" ? "aggregate view" : `as ${companyName(me!)}`}
              </span>
            </div>
            {role.kind === "regulator" ? (
              <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border px-4 py-12 text-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-muted-foreground" aria-hidden>
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <p className="max-w-sm text-sm text-muted-foreground">
                  The bilateral obligation graph is confidential. Regulators observe only the
                  aggregate audit ledger below.
                </p>
              </div>
            ) : (
              <ObligationGraph obligations={obligations} role={role} highlightIds={highlightIds} />
            )}
          </section>

          {/* Proposals */}
          {proposals.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
              <h2 className="mb-3 text-base font-semibold tracking-tight">Netting proposals</h2>
              <ul className="flex flex-col gap-2">
                {proposals.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setOpenProposal(p.id)}
                      className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2.5 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            <h2 className="mb-3 text-base font-semibold tracking-tight">
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
    </>
  )
}
