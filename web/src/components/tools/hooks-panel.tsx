"use client"

import { useState } from "react"

import { scoreHooks } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { HookResult } from "@/lib/tool-types"
import { CheckRows, ErrorText, useTool, Verdict } from "./shared"

export function HooksPanel() {
  const [input, setInput] = useState("")
  const { pending, result, error, run } = useTool<HookResult[]>()

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="hooks">Hook options, one per line</Label>
        <Textarea
          id="hooks"
          rows={5}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"Nobody tells you that your first 30 reels are supposed to flop\nI lost $18,000 because of one missing contract."}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button disabled={pending} onClick={() => run(() => scoreHooks(input))}>
          {pending ? "Scoring..." : "Score hooks"}
        </Button>
        <ErrorText error={error} />
      </div>
      {result && (
        <div className="grid gap-4">
          {result[0] && (
            <p className="text-muted-foreground text-sm">
              {result[0].score < 50
                ? "The top one is under 50. None of these is the hook yet."
                : "Shoot the top one."}
            </p>
          )}
          {result.map((h, i) => (
            <Card key={i} className={i === 0 ? "border-primary" : undefined}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="leading-snug">{h.hook}</CardTitle>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-2xl font-semibold tabular-nums">{h.score.toFixed(1)}</span>
                    <Verdict value={h.verdict} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                {h.flags.map((f) => (
                  <p key={f} className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                    {f}
                  </p>
                ))}
                <CheckRows checks={h.checks} weakest={h.weakest} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
