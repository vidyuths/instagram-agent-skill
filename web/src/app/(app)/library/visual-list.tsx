"use client"

import Link from "next/link"
import { useTransition } from "react"
import { Download, Pencil, Trash2 } from "lucide-react"

import { removeVisual } from "@/app/(app)/data-actions"
import { SlideImage } from "@/components/slide-image"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FORMATS, type FormatId } from "@/lib/slides"

type Row = { id: number; title: string; format: FormatId; count: number; cover: string; updated_at: string; created_at: string }

export function VisualList({ visuals }: { visuals: Row[] }) {
  const [pending, start] = useTransition()
  if (!visuals.length) {
    return <p className="text-muted-foreground text-sm">No slide sets yet. Ask the Studio for a carousel and then “Make images”.</p>
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visuals.map((v) => (
        <li key={v.id}>
          <Card className="h-full gap-3 overflow-hidden py-0">
            <Link href={`/visuals/${v.id}`} aria-label={`Open ${v.title}`}>
              <SlideImage src={`/api/visuals/${v.id}/1?v=${encodeURIComponent(v.updated_at)}`} alt={`Cover of ${v.title}: ${v.cover}`} className="rounded-none border-0 border-b" />
            </Link>
            <div className="grid gap-3 px-4 pb-4">
              <div>
                <h2 className="leading-snug font-semibold">{v.title}</h2>
                <p className="text-muted-foreground text-xs">
                  {FORMATS[v.format].label} · {v.count} slides · <time dateTime={v.created_at}>{new Date(v.created_at).toLocaleDateString()}</time>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/visuals/${v.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <Pencil /> Edit
                </Link>
                <a href={`/api/visuals/${v.id}/zip`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <Download /> Zip
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${v.title}`}
                  disabled={pending}
                  onClick={() => {
                    if (confirm("Delete this slide set?")) start(async () => void (await removeVisual(v.id)))
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}
