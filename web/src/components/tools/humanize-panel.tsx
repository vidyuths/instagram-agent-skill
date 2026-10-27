"use client"

import { useState } from "react"

import { humanize } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { HumanizeResult } from "@/lib/tool-types"
import { CheckRows, CopyButton, ErrorText, useTool, Verdict } from "./shared"

function ChangeList({ title, items }: { title: string; items: { label: string; count: number }[] }) {
  if (!items.length) return null
  return (
    <div className="grid gap-1">
      <p className="text-sm font-medium">{title}</p>
      <ul className="text-muted-foreground grid gap-0.5 text-sm">
        {items.map((i) => (
          <li key={i.label}>
            <span className="tabular-nums">{i.count}×</span> {i.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function HumanizePanel() {
  const [input, setInput] = useState("")
  const { pending, result, error, run } = useTool<HumanizeResult>()
  const delta = result ? result.after.human_score - result.before.human_score : 0

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="draft">Draft</Label>
        <Textarea id="draft" rows={8} value={input} onChange={(e) => setInput(e.target.value)} />
      </div>
      <div className="flex items-center gap-3">
        <Button disabled={pending} onClick={() => run(() => humanize(input))}>
          {pending ? "Cleaning..." : "Humanize"}
        </Button>
        <ErrorText error={error} />
      </div>
      {result && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Cleaned</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setInput(result.text)}>
                    Use as draft
                  </Button>
                  <CopyButton text={result.text} />
                </div>
              </div>
              <CardDescription>
                Human score {result.before.human_score.toFixed(1)} → {result.after.human_score.toFixed(1)} (
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(1)}) <Verdict value={result.after.verdict} />
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="bg-muted rounded-md p-3 text-sm break-words whitespace-pre-wrap">{result.text}</p>
              <CheckRows checks={result.after.checks} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>What changed</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <ChangeList
                title="Invisible characters removed"
                items={result.report.invisible.map((i) => ({ label: i.name, count: i.count }))}
              />
              <ChangeList
                title="Typography"
                items={result.report.typographic.map((t) => ({ label: `${t.name} → ${t.to}`, count: t.count }))}
              />
              <ChangeList
                title="Stock phrases replaced"
                items={result.report.lexical.map((l) => ({ label: `“${l.find}” → ${l.replace}`, count: l.count }))}
              />
              {result.report.structures.length > 0 && (
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Rewrite these yourself</p>
                  {result.report.structures.map((s) => (
                    <div key={s.name} className="bg-warning/15 rounded-md px-3 py-2 text-sm">
                      <p className="font-medium">
                        {s.name} <span className="text-muted-foreground tabular-nums">· {s.count}×</span>
                      </p>
                      <p className="text-muted-foreground text-xs">{s.fix}</p>
                    </div>
                  ))}
                </div>
              )}
              {!result.report.invisible.length &&
                !result.report.typographic.length &&
                !result.report.lexical.length &&
                !result.report.structures.length && <p className="text-muted-foreground text-sm">Nothing to change.</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
