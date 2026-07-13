"use client"

interface Metric {
  label: string
  value: string
  hint?: string
  accent?: "primary" | "signed-pos" | "signed-neg" | "neutral"
}

/**
 * Headline KPI band — communicates the compression story at a glance.
 * Role-aware: companies see their position, the regulator sees the
 * aggregate network compression.
 */
export function MetricsBar({ metrics }: { metrics: Metric[] }) {
  return (
    <section className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
      {metrics.map((m) => (
        <div key={m.label} className="flex flex-col gap-1.5 bg-card px-5 py-4">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {m.label}
          </span>
          <span
            className={`font-mono text-3xl font-semibold leading-none tabular-nums ${
              m.accent === "primary" || m.accent === "signed-pos"
                ? "text-primary"
                : m.accent === "signed-neg"
                  ? "text-rejected"
                  : "text-foreground"
            }`}
          >
            {m.value}
          </span>
          {m.hint && (
            <span className="font-mono text-[11px] text-muted-foreground">{m.hint}</span>
          )}
        </div>
      ))}
    </section>
  )
}
