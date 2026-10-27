"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ArrowDown, ArrowUp, CalendarPlus, Download, Plus, Trash2, TriangleAlert } from "lucide-react"

import { removeVisual, saveVisualAction } from "@/app/(app)/data-actions"
import { SlideImage } from "@/components/slide-image"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { TONE_LABELS, TONES } from "@/lib/brand-shared"
import { FORMAT_IDS, FORMATS, LAYOUT_LABELS, LAYOUTS, specSchema, type FormatId, type Layout, type SlideSpec } from "@/lib/slides"
import { cn } from "@/lib/utils"

type EditSlide = {
  layout: Layout
  tone: string // "" means automatic
  eyebrow: string
  title: string
  body: string
  itemsText: string
  action: string
}

const toEdit = (s: SlideSpec["slides"][number]): EditSlide => ({
  layout: s.layout,
  tone: s.tone ?? "",
  eyebrow: s.eyebrow ?? "",
  title: s.title,
  body: s.body ?? "",
  itemsText: (s.items ?? []).join("\n"),
  action: s.action ?? "",
})

export function VisualEditor({ id, spec, updatedAt, warnings }: { id: number; spec: SlideSpec; updatedAt: string; warnings: string[] }) {
  const router = useRouter()
  const [title, setTitle] = useState(spec.title)
  const [format, setFormat] = useState<FormatId>(spec.format)
  const [alt, setAlt] = useState(spec.alt ?? "")
  const [caption, setCaption] = useState(spec.caption ?? "")
  const [slides, setSlides] = useState<EditSlide[]>(spec.slides.map(toEdit))
  const [rev, setRev] = useState(0)
  const [pending, start] = useTransition()
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const version = `${encodeURIComponent(updatedAt)}-${rev}`
  const patch = (i: number, p: Partial<EditSlide>) => setSlides((all) => all.map((s, j) => (j === i ? { ...s, ...p } : s)))
  const move = (i: number, d: -1 | 1) =>
    setSlides((all) => {
      const j = i + d
      if (j < 0 || j >= all.length) return all
      const next = [...all]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  function save() {
    const candidate = {
      format,
      title,
      alt: alt.trim() || undefined,
      caption: caption.trim() || undefined,
      slides: slides.map((s) => ({
        layout: s.layout,
        tone: s.tone || undefined,
        eyebrow: s.eyebrow.trim() || undefined,
        title: s.title,
        body: s.body.trim() || undefined,
        items: s.itemsText.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 6),
        action: s.action.trim() || undefined,
      })).map((s) => ({ ...s, items: s.items.length ? s.items : undefined })),
    }
    const parsed = specSchema.safeParse(candidate)
    if (!parsed.success) return setStatus({ ok: false, msg: parsed.error.issues[0].message })
    start(async () => {
      const res = await saveVisualAction(id, parsed.data)
      if (res.ok) {
        setStatus({ ok: true, msg: "Saved. Previews are updated." })
        setRev((r) => r + 1)
        router.refresh()
      } else setStatus({ ok: false, msg: res.error })
    })
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{spec.title}</h1>
          <p className="text-muted-foreground text-sm">
            {FORMATS[spec.format].label} · {spec.slides.length} slides · {FORMATS[spec.format].w}×{FORMATS[spec.format].h}px
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={`/api/visuals/${id}/zip`} className={buttonVariants({ variant: "default", size: "sm" })}>
            <Download /> Download all (.zip)
          </a>
          <Link href={`/calendar?visual=${id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <CalendarPlus /> Add to calendar
          </Link>
        </div>
      </div>

      {warnings.length > 0 && (
        <div role="status" className="bg-warning/15 grid gap-1 rounded-md px-3 py-2 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <TriangleAlert className="size-4" /> Worth a look
          </p>
          <ul className="list-disc pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Set details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="v-title">Name</Label>
            <Input id="v-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="v-format">Format</Label>
            <NativeSelect id="v-format" value={format} onChange={(e) => setFormat(e.target.value as FormatId)}>
              {FORMAT_IDS.map((f) => (
                <option key={f} value={f}>
                  {FORMATS[f].label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="v-alt">Alt text for the cover</Label>
            <Textarea id="v-alt" rows={2} value={alt} onChange={(e) => setAlt(e.target.value)} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="v-caption">Caption</Label>
            <Textarea id="v-caption" rows={4} value={caption} onChange={(e) => setCaption(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <p className="text-muted-foreground -mb-2 text-sm">The pictures show the last saved version. Save after editing to refresh them.</p>
      <ol className="grid gap-4">
        {slides.map((s, i) => (
          <li key={i}>
            <Card className="gap-4 py-4">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>
                    Slide {i + 1} of {slides.length}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" aria-label={`Move slide ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Move slide ${i + 1} down`} disabled={i === slides.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete slide ${i + 1}`}
                      disabled={slides.length === 1}
                      onClick={() => setSlides((all) => all.filter((_, j) => j !== i))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-[14rem_1fr]">
                <div className="grid content-start gap-2">
                  {i < spec.slides.length ? (
                    <>
                      <SlideImage src={`/api/visuals/${id}/${i + 1}?v=${version}`} alt={`Slide ${i + 1}: ${spec.slides[i].title}`} />
                      <a href={`/api/visuals/${id}/${i + 1}?download=1&v=${version}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}>
                        <Download /> PNG
                      </a>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm">New slide. Save to see it.</p>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor={`l-${i}`}>Layout</Label>
                    <NativeSelect id={`l-${i}`} value={s.layout} onChange={(e) => patch(i, { layout: e.target.value as Layout })}>
                      {LAYOUTS.map((l) => (
                        <option key={l} value={l}>
                          {LAYOUT_LABELS[l]}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`t-${i}`}>Background</Label>
                    <NativeSelect id={`t-${i}`} value={s.tone} onChange={(e) => patch(i, { tone: e.target.value })}>
                      <option value="">Automatic</option>
                      {TONES.map((t) => (
                        <option key={t} value={t}>
                          {TONE_LABELS[t]}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor={`h-${i}`}>Title</Label>
                    <Input id={`h-${i}`} value={s.title} onChange={(e) => patch(i, { title: e.target.value })} />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor={`b-${i}`}>{s.layout === "quote" ? "Attribution" : "Text under the title"}</Label>
                    <Textarea id={`b-${i}`} rows={2} value={s.body} onChange={(e) => patch(i, { body: e.target.value })} />
                  </div>
                  {s.layout === "list" && (
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor={`i-${i}`}>List items, one per line (up to 6)</Label>
                      <Textarea id={`i-${i}`} rows={4} value={s.itemsText} onChange={(e) => patch(i, { itemsText: e.target.value })} />
                    </div>
                  )}
                  {s.layout === "cta" && (
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor={`a-${i}`}>Button text</Label>
                      <Input id={`a-${i}`} value={s.action} onChange={(e) => patch(i, { action: e.target.value })} placeholder="Comment CALM" />
                    </div>
                  )}
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor={`e-${i}`}>Small label above the title (optional)</Label>
                    <Input id={`e-${i}`} value={s.eyebrow} maxLength={40} onChange={(e) => patch(i, { eyebrow: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Saving..." : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={slides.length >= 20}
          onClick={() => setSlides((all) => [...all, { layout: "statement", tone: "", eyebrow: "", title: "New slide", body: "", itemsText: "", action: "" }])}
        >
          <Plus /> Add a slide
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (confirm("Delete this slide set? Calendar posts that use it keep their text.")) {
              start(async () => {
                const res = await removeVisual(id)
                if (res.ok) router.push("/library?tab=visuals")
                else setStatus({ ok: false, msg: res.error })
              })
            }
          }}
        >
          <Trash2 /> Delete set
        </Button>
        {status && (
          <p role="status" className={status.ok ? "text-success text-sm" : "text-destructive text-sm"}>
            {status.msg}
          </p>
        )}
      </div>
    </div>
  )
}
