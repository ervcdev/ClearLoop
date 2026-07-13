"use client"

interface Props {
  hasProposal: boolean
  signed: number
  total: number
  extinctions: number
}

/**
 * Lightweight walkthrough so a first-time viewer follows the netting
 * lifecycle: detect a balanced cycle, collect multi-party signatures,
 * settle atomically on-chain. Derives the active step from live state.
 */
export function DemoGuide({ hasProposal, signed, total, extinctions }: Props) {
  const signaturesComplete = hasProposal && total > 0 && signed >= total
  const step = extinctions > 0 && !hasProposal ? 3 : hasProposal ? (signaturesComplete ? 3 : 2) : 1

  const steps = [
    { n: 1, title: "Detect cycle", desc: "Solver finds a balanced obligation loop (ΣΔ = 0)." },
    { n: 2, title: "Collect signatures", desc: "Each party signs an EIP-712 approval." },
    { n: 3, title: "Atomic settlement", desc: "The whole loop extinguishes in one transaction." },
  ]

  return (
    <div className="flex flex-col gap-3">
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        Netting lifecycle
      </span>
      <ol className="flex flex-col gap-1">
        {steps.map((s) => {
          const active = s.n === step
          const done = s.n < step || (s.n === 3 && extinctions > 0 && !hasProposal)
          return (
            <li
              key={s.n}
              className={`flex gap-3 rounded-md border px-3 py-2.5 transition-colors ${
                active ? "border-primary/50 bg-primary/5" : "border-transparent"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px] ${
                  done
                    ? "bg-primary text-primary-foreground"
                    : active
                      ? "border border-primary text-primary"
                      : "border border-border text-muted-foreground"
                }`}
              >
                {done ? "✓" : s.n}
              </span>
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium leading-tight ${active ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {s.title}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{s.desc}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
