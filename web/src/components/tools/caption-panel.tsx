"use client"

import { useState } from "react"

import { lintCaption } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { CaptionResult } from "@/lib/tool-types"
import { ErrorText, useTool, Verdict } from "./shared"

export function CaptionPanel() {
  const [input, setInput] = useState("")
  const [keywords, setKeywords] = useState("")
  const { pending, result, error, run } = useTool<CaptionResult>()

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="caption">Caption</Label>
        <Textarea id="caption" rows={8} value={input} onChange={(e) => setInput(e.target.value)} />
        <p className="text-muted-foreground text-xs">{input.trim().length} / 2200 characters</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="keywords">Search terms you want to be found for (optional, comma-separated)</Label>
        <Input id="keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="client contracts, freelance pricing" />
      </div>
      <div className="flex items-center gap-3">
        <Button disabled={pending} onClick={() => run(() => lintCaption(input, keywords))}>
          {pending ? "Checking..." : "Check caption"}
        </Button>
        <ErrorText error={error} />
      </div>
      {result && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>What the feed shows</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="bg-muted rounded-md p-3 text-sm break-words whitespace-pre-wrap">
                {result.visible}
                {result.truncated && <span className="text-muted-foreground">... more</span>}
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                {result.truncated
                  ? `Cut at about ${result.truncate_at} characters. Everything after is behind a tap.`
                  : "The whole caption fits."}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Checks</CardTitle>
                {result.verdict && <Verdict value={result.verdict} />}
              </div>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3">
                {result.checks.map((c) => (
                  <li key={c.check} className="grid grid-cols-[3.5rem_1fr] gap-x-3 text-sm">
                    <Verdict value={c.status} />
                    <div>
                      <p className="font-medium">{c.check}</p>
                      <p className="text-muted-foreground text-xs">{c.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
