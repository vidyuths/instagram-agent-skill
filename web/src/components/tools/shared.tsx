"use client"

import { useState, useTransition } from "react"
import { Check, Copy } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ActionResult, Check as ScoreCheck } from "@/lib/tool-types"
import { cn } from "@/lib/utils"

const GOOD = new Set(["STRONG", "PASS", "READY", "HUMAN"])
const BAD = new Set(["WEAK", "FAIL", "FIX", "FLAGGED"])

export function Verdict({ value }: { value: string }) {
  const variant = GOOD.has(value) ? "success" : BAD.has(value) ? "destructive" : "warning"
  return <Badge variant={variant}>{value}</Badge>
}

function tone(score: number) {
  return score >= 70 ? "bg-success" : score >= 45 ? "bg-warning" : "bg-destructive"
}

export function ScoreBar({ score }: { score: number }) {
  return (
    <div className="bg-muted h-2 w-full overflow-hidden rounded-full" role="presentation">
      <div className={cn("h-full rounded-full", tone(score))} style={{ width: `${Math.max(2, Math.min(100, score))}%` }} />
    </div>
  )
}

export function CheckRows({ checks, weakest }: { checks: Record<string, ScoreCheck>; weakest?: string }) {
  return (
    <dl className="grid gap-3">
      {Object.entries(checks).map(([name, c]) => (
        <div key={name} className="grid gap-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <dt className={cn("font-medium", name === weakest && "text-destructive")}>
              {name}
              {name === weakest && <span className="text-muted-foreground font-normal"> · weakest</span>}
            </dt>
            <dd className="tabular-nums">{Math.round(c.score)}</dd>
          </div>
          <ScoreBar score={c.score} />
          <p className="text-muted-foreground text-xs">{c.detail}</p>
        </div>
      ))}
    </dl>
  )
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : "Copy"}
    </Button>
  )
}

// Runs a server action and keeps its latest result or error.
export function useTool<T>() {
  const [pending, start] = useTransition()
  const [result, setResult] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  function run(action: () => Promise<ActionResult<T>>) {
    start(async () => {
      const res = await action()
      if (res.ok) {
        setResult(res.data)
        setError(null)
      } else {
        setError(res.error)
      }
    })
  }
  return { pending, result, error, run }
}

export function ErrorText({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p role="alert" className="text-destructive text-sm">
      {error}
    </p>
  )
}
