"use client"

import { useState, useTransition } from "react"

import { saveVoice } from "@/app/(app)/data-actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function VoiceForm({ initial, isSaved }: { initial: string; isSaved: boolean }) {
  const [text, setText] = useState(initial)
  const [pending, start] = useTransition()
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(
    isSaved ? null : { ok: false, msg: "Not saved yet. This is the blank template." },
  )

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await saveVoice(text)
          setStatus(res.ok ? { ok: true, msg: "Saved." } : { ok: false, msg: res.error })
        })
      }}
    >
      <Label htmlFor="voice">voice.md</Label>
      <Textarea id="voice" rows={26} className="font-mono text-sm" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save voice"}
        </Button>
        {status && (
          <p role="status" className={status.ok ? "text-success text-sm" : "text-muted-foreground text-sm"}>
            {status.msg}
          </p>
        )}
      </div>
    </form>
  )
}
