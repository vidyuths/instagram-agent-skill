"use client"

import { useState } from "react"

import { beatSheet } from "@/app/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { BeatSheet } from "@/lib/tool-types"
import { ErrorText, useTool } from "./shared"

function timecode(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}`
}

export function BeatsPanel() {
  const [input, setInput] = useState("")
  const [target, setTarget] = useState("30")
  const [wpm, setWpm] = useState("165")
  const { pending, result, error, run } = useTool<BeatSheet>()

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="script">Script, one beat per line</Label>
        <Textarea id="script" rows={8} value={input} onChange={(e) => setInput(e.target.value)} />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-2">
          <Label htmlFor="target">Target seconds</Label>
          <Input id="target" type="number" min={1} className="w-28" value={target} onChange={(e) => setTarget(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="wpm">Words per minute</Label>
          <Input id="wpm" type="number" min={60} className="w-28" value={wpm} onChange={(e) => setWpm(e.target.value)} />
        </div>
        <Button
          disabled={pending}
          onClick={() => run(() => beatSheet(input, { target: Number(target) || undefined, wpm: Number(wpm) || undefined }))}
        >
          {pending ? "Timing..." : "Build beat sheet"}
        </Button>
      </div>
      <ErrorText error={error} />
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Beat sheet</CardTitle>
            <CardDescription>
              {result.total_words} words · ~{result.total_seconds.toFixed(1)}s at {result.wpm} wpm
              {result.target ? ` · target ${result.target}s` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ol className="grid gap-2">
              {result.beats.map((b) => (
                <li key={b.n} className="grid grid-cols-[4rem_3.5rem_1fr] gap-x-3 text-sm sm:grid-cols-[4rem_3.5rem_4rem_1fr]">
                  <span className="text-muted-foreground font-mono tabular-nums">{timecode(b.start)}</span>
                  <span className="font-mono tabular-nums">{b.dur.toFixed(1)}s</span>
                  <span className="hidden sm:block">{b.label && <Badge variant="outline">{b.label}</Badge>}</span>
                  <div>
                    <p>{b.text}</p>
                    {b.flags.map((f) => (
                      <p key={f} className="text-destructive text-xs">
                        {f}
                      </p>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
            {result.notes.length > 0 && (
              <ul className="text-muted-foreground grid list-disc gap-1 border-t pt-4 pl-5 text-sm">
                {result.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
