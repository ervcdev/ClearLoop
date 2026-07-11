"use client"

import { useMemo } from "react"
import { COMPANIES } from "@/lib/mock-data"
import type { Obligation, Role } from "@/lib/types"

const W = 440
const H = 340
const CX = W / 2
const CY = H / 2
const R = 118
const NODE_R = 26

interface Props {
  obligations: Obligation[]
  role: Role
  /** obligation ids belonging to the cycle currently in focus */
  highlightIds?: string[]
}

function nodePositions() {
  const n = COMPANIES.length
  const pos = new Map<string, { x: number; y: number }>()
  COMPANIES.forEach((c, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    pos.set(c.address, { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) })
  })
  return pos
}

export function ObligationGraph({ obligations, role, highlightIds = [] }: Props) {
  const pos = useMemo(nodePositions, [])
  const highlight = useMemo(() => new Set(highlightIds), [highlightIds])
  const me = role.kind === "company" ? role.address : null

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Directed graph of bilateral obligations between companies"
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" style={{ fill: "var(--primary)" }} />
          </marker>
          <marker id="arrow-muted" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" style={{ fill: "var(--muted-foreground)" }} />
          </marker>
        </defs>

        {/* Edges: debtor → creditor (direction money is owed) */}
        {obligations.map((o) => {
          const from = pos.get(o.debtor)!
          const to = pos.get(o.creditor)!
          const isMine = me !== null && (o.creditor === me || o.debtor === me)
          const visible = isMine // privacy: only my own edges are legible
          const inCycle = highlight.has(o.id)

          // Curve control point offset perpendicular to the edge.
          const mx = (from.x + to.x) / 2
          const my = (from.y + to.y) / 2
          const dx = to.x - from.x
          const dy = to.y - from.y
          const len = Math.hypot(dx, dy) || 1
          const off = 26
          const cxp = mx + (dy / len) * off
          const cyp = my - (dx / len) * off

          // Trim endpoints to node radius.
          const start = trim(from, { x: cxp, y: cyp }, NODE_R)
          const end = trim(to, { x: cxp, y: cyp }, NODE_R)

          const stroke = o.settled
            ? "var(--muted-foreground)"
            : visible
              ? "var(--primary)"
              : "var(--muted-foreground)"
          const marker = visible && !o.settled ? "url(#arrow)" : "url(#arrow-muted)"

          return (
            <g key={o.id} opacity={o.settled ? 0.35 : 1}>
              <path
                d={`M ${start.x} ${start.y} Q ${cxp} ${cyp} ${end.x} ${end.y}`}
                strokeWidth={inCycle ? 3 : visible ? 2 : 1.25}
                strokeDasharray={visible ? undefined : "3 4"}
                markerEnd={marker}
                strokeLinecap="round"
                style={{ fill: "none", stroke }}
              />
              {visible && (
                <text
                  x={cxp}
                  y={cyp}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-mono"
                  fontSize="11"
                  style={{
                    fill: o.settled ? "var(--muted-foreground)" : "var(--foreground)",
                    textDecoration: o.settled ? "line-through" : "none",
                  }}
                >
                  {o.amount.toLocaleString()}
                </text>
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {COMPANIES.map((c) => {
          const p = pos.get(c.address)!
          const isMe = me === c.address
          return (
            <g key={c.address}>
              <circle
                cx={p.x}
                cy={p.y}
                r={NODE_R}
                strokeWidth={1.5}
                style={{
                  fill: isMe ? "var(--primary)" : "var(--card)",
                  stroke: isMe ? "var(--primary)" : "var(--border)",
                }}
              />
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-mono font-medium"
                fontSize="13"
                style={{ fill: isMe ? "var(--primary-foreground)" : "var(--foreground)" }}
              >
                {c.short}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-primary" /> your obligation
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t border-dashed border-muted-foreground" /> opaque commitment
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-muted-foreground opacity-40" /> settled
        </span>
      </div>
    </div>
  )
}

function trim(target: { x: number; y: number }, control: { x: number; y: number }, r: number) {
  const dx = target.x - control.x
  const dy = target.y - control.y
  const len = Math.hypot(dx, dy) || 1
  return { x: target.x - (dx / len) * r, y: target.y - (dy / len) * r }
}
