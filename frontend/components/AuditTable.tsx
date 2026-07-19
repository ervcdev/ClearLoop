"use client"

import type { AuditRecord } from "@/lib/types"
import { shortHex } from "@/lib/netting"

export function AuditTable({ records }: { records: AuditRecord[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 px-3 py-2.5">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="mt-0.5 shrink-0 text-muted-foreground"
          aria-hidden
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <p className="text-xs text-muted-foreground">
          Aggregate ledger only. Records carry notional totals and fiscal hashes —
          never creditor, debtor, or per-obligation amounts.
        </p>
      </div>

      {records.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No extinction events recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Tx</th>
                <th className="px-4 py-2.5 font-medium">Event</th>
                <th className="px-4 py-2.5 font-medium">Notional</th>
                <th className="px-4 py-2.5 font-medium">Fiscal hash</th>
                <th className="px-4 py-2.5 font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.txId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    #{r.txId}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-settled/30 bg-settled/10 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-settled">
                      {r.kind}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">{r.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground" title={r.fiscalHash}>
                    {shortHex(r.fiscalHash, 10, 6)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {new Date(r.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
