"use client"

import { useContract } from "@/hooks/useContract"
import { COMPANIES } from "@/lib/mock-data"
import { shortHex } from "@/lib/netting"
import type { Role } from "@/lib/types"

function isActive(role: Role, target: Role): boolean {
  if (role.kind === "regulator" && target.kind === "regulator") return true
  if (role.kind === "company" && target.kind === "company") return role.address === target.address
  return false
}

/**
 * Impersonate a participant to demonstrate the privacy model: each company
 * only sees the obligations it is party to; the regulator only sees the
 * aggregate audit log — never counterparties or amounts of others.
 */
export function RoleSwitcher() {
  const { role, setRole } = useContract()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Acting as
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {role.kind === "regulator" ? "read-only" : "signer"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {COMPANIES.map((c) => {
          const target: Role = { kind: "company", address: c.address }
          const active = isActive(role, target)
          return (
            <button
              key={c.address}
              type="button"
              onClick={() => setRole(target)}
              aria-pressed={active}
              className={`flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors ${
                active
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-medium ${
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {c.short}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{c.name}</span>
                <span className="block truncate font-mono text-[11px] text-muted-foreground">
                  {shortHex(c.address)}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => setRole({ kind: "regulator" })}
        aria-pressed={role.kind === "regulator"}
        className={`flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors ${
          role.kind === "regulator"
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/40"
        }`}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-medium ${
            role.kind === "regulator" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          RG
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium">Regulator</span>
          <span className="block font-mono text-[11px] text-muted-foreground">
            aggregate audit only
          </span>
        </span>
      </button>
    </div>
  )
}
