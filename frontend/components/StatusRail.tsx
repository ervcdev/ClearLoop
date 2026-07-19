"use client"

import { useEffect, useState } from "react"

/**
 * Live status spine — gives the terminal a heartbeat: a pulsing LIVE
 * indicator, a UTC clock, and a block height that ticks upward, plus
 * network context. Purely presentational; no data is fetched.
 */
export function StatusRail({ parties }: { parties: number }) {
  const [now, setNow] = useState<Date | null>(null)
  const [block, setBlock] = useState(19_482_113)

  useEffect(() => {
    setNow(new Date())
    const clock = setInterval(() => setNow(new Date()), 1000)
    // Cosmetic: mimic a chain advancing ~ every 2s.
    const chain = setInterval(() => setBlock((b) => b + 1), 2100)
    return () => {
      clearInterval(clock)
      clearInterval(chain)
    }
  }, [])

  const utc = now
    ? now.toISOString().slice(11, 19)
    : "--:--:--"

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border bg-card/40 px-4 py-2 font-mono text-[11px] sm:px-6">
      <span className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="cl-pulse-ring absolute inline-flex h-full w-full rounded-full bg-signal" />
          <span className="cl-live-dot relative inline-flex h-2 w-2 rounded-full bg-signal" />
        </span>
        <span className="font-medium tracking-wider text-signal">LIVE</span>
      </span>

      <Field label="NETWORK" value="clearloop-mainnet" />
      <Field label="BLOCK" value={`#${block.toLocaleString()}`} />
      <Field label="UTC" value={utc} />

      <span className="ml-auto flex items-center gap-2 text-muted-foreground">
        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
        {parties} parties online
      </span>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-muted-foreground/70">{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </span>
  )
}
