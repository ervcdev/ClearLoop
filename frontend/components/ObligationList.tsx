"use client"

import type { Obligation } from "@/lib/types"
import { companyName } from "@/lib/mock-data"
import { shortHex } from "@/lib/netting"

/** Obligations the acting company is a party to (privacy-scoped). */
export function ObligationList({
  obligations,
  me,
}: {
  obligations: Obligation[]
  me: string
}) {
  const mine = obligations.filter((o) => o.creditor === me || o.debtor === me)

  if (mine.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        You are not party to any obligations.
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {mine.map((o) => {
        const isCreditor = o.creditor === me
        const counterparty = isCreditor ? o.debtor : o.creditor
        return (
          <li
            key={o.id}
            className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5"
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-[11px] uppercase ${
                isCreditor
                  ? "bg-settled/10 text-settled"
                  : "bg-pending/10 text-pending"
              }`}
              title={isCreditor ? "Receivable" : "Payable"}
            >
              {isCreditor ? "IN" : "OUT"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm">
                {isCreditor ? "Owed by " : "You owe "}
                <span className="font-medium">{companyName(counterparty)}</span>
              </p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                {shortHex(o.id, 10, 6)}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p
                className={`font-mono text-sm font-medium ${o.settled ? "text-muted-foreground line-through" : ""}`}
              >
                {o.amount.toLocaleString()}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {o.settled ? "settled" : "open"}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
