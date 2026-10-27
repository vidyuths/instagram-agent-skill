"use client"

import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"

import { removeDraft } from "@/app/(app)/data-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CopyButton } from "@/components/tools/shared"
import { Markdown } from "@/components/markdown"

type Row = { id: number; skill: string; skillLabel: string; title: string; content: string; created_at: string }

export function DraftList({ drafts }: { drafts: Row[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const [pending, start] = useTransition()

  if (!drafts.length) {
    return <p className="text-muted-foreground text-sm">Nothing saved yet. Use “Save” under a Studio reply.</p>
  }
  return (
    <ul className="grid gap-3">
      {drafts.map((d) => (
        <li key={d.id}>
          <Card className="gap-3 py-4">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-1">
                  <CardTitle className="leading-snug">{d.title}</CardTitle>
                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    <Badge variant="secondary">{d.skillLabel}</Badge>
                    <time dateTime={d.created_at}>{new Date(d.created_at).toLocaleString()}</time>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <CopyButton text={d.content} />
                  <Button variant="outline" size="sm" aria-expanded={open === d.id} onClick={() => setOpen(open === d.id ? null : d.id)}>
                    {open === d.id ? "Hide" : "View"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${d.title}`}
                    disabled={pending}
                    onClick={() => {
                      if (confirm("Delete this draft?")) start(async () => void (await removeDraft(d.id)))
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </CardHeader>
            {open === d.id && (
              <CardContent>
                <Markdown>{d.content}</Markdown>
              </CardContent>
            )}
          </Card>
        </li>
      ))}
    </ul>
  )
}
