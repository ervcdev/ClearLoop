import type { ProposalStatus } from "@/lib/types"

const STYLES: Record<ProposalStatus | "Settled" | "Open", string> = {
  Pending: "bg-pending/10 text-pending border-pending/30",
  Executed: "bg-settled/10 text-settled border-settled/30",
  Rejected: "bg-rejected/10 text-rejected border-rejected/30",
  Settled: "bg-settled/10 text-settled border-settled/30",
  Open: "bg-muted text-muted-foreground border-border",
}

export function StatusBadge({
  status,
}: {
  status: ProposalStatus | "Settled" | "Open"
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider ${STYLES[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full bg-current ${status === "Pending" ? "cl-live-dot" : ""}`}
        aria-hidden
      />
      {status}
    </span>
  )
}
