"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react"

import { removePost, savePost } from "@/app/(app)/data-actions"
import { SlideImage } from "@/components/slide-image"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import type { PostRow } from "@/lib/db"
import { KIND_LABELS, KINDS, postSchema, STATUS_LABELS, STATUSES, type Kind, type PostFields, type Status } from "@/lib/posts-shared"
import { cn } from "@/lib/utils"

type VisualOption = { id: number; title: string; updated_at: string }

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function iso(d: Date) {
  return d.toISOString().slice(0, 10)
}
function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number)
  return iso(new Date(Date.UTC(y, m - 1 + by, 1))).slice(0, 7)
}
function monthCells(month: string) {
  const [y, m] = month.split("-").map(Number)
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7 // Monday first
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const rows = Math.ceil((lead + days) / 7)
  return Array.from({ length: rows * 7 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1, 1 - lead + i))
    return { date: iso(d), inMonth: d.getUTCMonth() === m - 1, day: d.getUTCDate() }
  })
}
function longDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
}

const STATUS_VARIANT: Record<Status, "outline" | "secondary" | "warning" | "success"> = {
  idea: "outline",
  drafted: "secondary",
  designed: "secondary",
  scheduled: "warning",
  posted: "success",
}

type Draft = { id: number | null; fields: PostFields }
const blank = (date: string | null): PostFields => ({
  title: "",
  kind: "post",
  status: "idea",
  scheduled_date: date,
  scheduled_time: null,
  caption: "",
  notes: "",
  visual_id: null,
})

export function CalendarView({
  month,
  today,
  posts,
  visuals,
  prefill,
}: {
  month: string
  today: string
  posts: PostRow[]
  visuals: VisualOption[]
  prefill: PostFields | null
}) {
  const router = useRouter()
  const [selected, setSelected] = useState(prefill?.scheduled_date ?? (today.startsWith(month) ? today : `${month}-01`))
  const [draft, setDraft] = useState<Draft | null>(prefill ? { id: null, fields: prefill } : null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const cells = useMemo(() => monthCells(month), [month])
  const byDate = useMemo(() => {
    const map = new Map<string, PostRow[]>()
    for (const p of posts) if (p.scheduled_date) map.set(p.scheduled_date, [...(map.get(p.scheduled_date) ?? []), p])
    return map
  }, [posts])
  const unscheduled = posts.filter((p) => !p.scheduled_date)
  const dayPosts = byDate.get(selected) ?? []
  const monthName = new Date(`${month}-01T00:00:00Z`).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" })

  const edit = (p: PostRow) => {
    setError(null)
    setDraft({
      id: p.id,
      fields: {
        title: p.title,
        kind: p.kind as Kind,
        status: p.status as Status,
        scheduled_date: p.scheduled_date,
        scheduled_time: p.scheduled_time,
        caption: p.caption,
        notes: p.notes,
        visual_id: p.visual_id,
      },
    })
  }
  const set = (patch: Partial<PostFields>) => setDraft((d) => (d ? { ...d, fields: { ...d.fields, ...patch } } : d))

  function submit() {
    if (!draft) return
    const parsed = postSchema.safeParse(draft.fields)
    if (!parsed.success) return setError(parsed.error.issues[0].message)
    start(async () => {
      const res = await savePost(draft.id, parsed.data)
      if (res.ok) {
        setError(null)
        setDraft(null)
        if (parsed.data.scheduled_date) setSelected(parsed.data.scheduled_date)
        router.replace(`/calendar?m=${parsed.data.scheduled_date?.slice(0, 7) ?? month}`)
        router.refresh()
      } else setError(res.error)
    })
  }

  const visual = draft?.fields.visual_id ? visuals.find((v) => v.id === draft.fields.visual_id) : undefined

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Calendar</h1>
        <div className="flex items-center gap-1">
          <Link href={`/calendar?m=${shiftMonth(month, -1)}`} aria-label="Previous month" className={buttonVariants({ variant: "outline", size: "icon" })}>
            <ChevronLeft />
          </Link>
          <h2 className="min-w-40 text-center text-sm font-medium" aria-live="polite">
            {monthName}
          </h2>
          <Link href={`/calendar?m=${shiftMonth(month, 1)}`} aria-label="Next month" className={buttonVariants({ variant: "outline", size: "icon" })}>
            <ChevronRight />
          </Link>
          <Link href="/calendar" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "ml-1")}>
            Today
          </Link>
        </div>
      </div>

      <div role="group" aria-label={`${monthName}, pick a day`} className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
        {WEEKDAYS.map((d) => (
          <div key={d} aria-hidden="true" className="bg-muted text-muted-foreground px-1 py-1.5 text-center text-xs font-medium">
            {d}
          </div>
        ))}
        {cells.map((c) => {
          const items = byDate.get(c.date) ?? []
          const isSel = c.date === selected
          return (
            <button
              key={c.date}
              type="button"
              aria-pressed={isSel}
              aria-label={`${longDate(c.date)}, ${items.length} ${items.length === 1 ? "post" : "posts"}${c.date === today ? ", today" : ""}`}
              onClick={() => {
                setSelected(c.date)
                setDraft(null)
              }}
              className={cn(
                "bg-background focus-visible:ring-ring/60 relative grid min-h-16 content-start gap-1 p-1 text-left outline-none focus-visible:z-10 focus-visible:ring-2 sm:min-h-24 sm:p-1.5",
                !c.inMonth && "bg-muted/50 text-muted-foreground",
                isSel && "ring-primary z-10 ring-2",
              )}
            >
              <span className={cn("flex size-6 items-center justify-center rounded-full text-xs tabular-nums", c.date === today && "bg-primary text-primary-foreground font-semibold")}>
                {c.day}
              </span>
              {items.slice(0, 2).map((p) => (
                <span key={p.id} className="bg-secondary hidden truncate rounded px-1 py-0.5 text-xs sm:block">
                  <span className="font-semibold">{KIND_LABELS[p.kind as Kind][0]}</span> {p.title}
                </span>
              ))}
              {items.length > 2 && <span className="text-muted-foreground hidden text-xs sm:block">+{items.length - 2} more</span>}
              {items.length > 0 && <span className="bg-primary text-primary-foreground absolute right-1 bottom-1 rounded-full px-1.5 text-[10px] sm:hidden">{items.length}</span>}
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="gap-3 py-4">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{longDate(selected)}</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setError(null)
                  setDraft({ id: null, fields: blank(selected) })
                }}
              >
                <Plus /> Add post
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {dayPosts.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nothing planned for this day.</p>
            ) : (
              <ul className="grid gap-2">
                {dayPosts.map((p) => (
                  <PostItem key={p.id} post={p} onEdit={() => edit(p)} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="gap-3 py-4">
          <CardHeader>
            <CardTitle>Unscheduled ({unscheduled.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {unscheduled.length === 0 ? (
              <p className="text-muted-foreground text-sm">Ideas without a date show up here.</p>
            ) : (
              <ul className="grid gap-2">
                {unscheduled.map((p) => (
                  <PostItem key={p.id} post={p} onEdit={() => edit(p)} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {draft && (
        <Card id="post-form">
          <CardHeader>
            <CardTitle>{draft.id ? "Edit post" : "New post"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault()
                submit()
              }}
            >
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="p-title">Title</Label>
                <Input id="p-title" value={draft.fields.title} onChange={(e) => set({ title: e.target.value })} autoFocus />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="p-kind">Format</Label>
                <NativeSelect id="p-kind" value={draft.fields.kind} onChange={(e) => set({ kind: e.target.value as Kind })}>
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABELS[k]}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="p-status">Status</Label>
                <NativeSelect id="p-status" value={draft.fields.status} onChange={(e) => set({ status: e.target.value as Status })}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="p-date">Date</Label>
                <Input id="p-date" type="date" value={draft.fields.scheduled_date ?? ""} onChange={(e) => set({ scheduled_date: e.target.value || null })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="p-time">Time (optional)</Label>
                <Input id="p-time" type="time" value={draft.fields.scheduled_time ?? ""} onChange={(e) => set({ scheduled_time: e.target.value || null })} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="p-visual">Slides</Label>
                <NativeSelect id="p-visual" value={draft.fields.visual_id ?? ""} onChange={(e) => set({ visual_id: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">None</option>
                  {visuals.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title}
                    </option>
                  ))}
                </NativeSelect>
                {visual && (
                  <div className="flex items-center gap-3">
                    <SlideImage src={`/api/visuals/${visual.id}/1?v=${encodeURIComponent(visual.updated_at)}`} alt={`Cover of ${visual.title}`} className="w-24" />
                    <Link href={`/visuals/${visual.id}`} className="text-sm underline underline-offset-2">
                      Open slides
                    </Link>
                  </div>
                )}
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="p-caption">Caption</Label>
                <Textarea id="p-caption" rows={5} value={draft.fields.caption} onChange={(e) => set({ caption: e.target.value })} />
                <p className="text-muted-foreground text-xs tabular-nums">{draft.fields.caption.length} / 2200</p>
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="p-notes">Notes, script or brief</Label>
                <Textarea id="p-notes" rows={6} value={draft.fields.notes} onChange={(e) => set({ notes: e.target.value })} />
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving..." : "Save post"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
                {draft.id !== null && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Delete this post?")) {
                        start(async () => {
                          const res = await removePost(draft.id as number)
                          if (res.ok) {
                            setDraft(null)
                            router.refresh()
                          } else setError(res.error)
                        })
                      }
                    }}
                  >
                    <Trash2 /> Delete
                  </Button>
                )}
                {error && (
                  <p role="alert" className="text-destructive text-sm">
                    {error}
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PostItem({ post, onEdit }: { post: PostRow; onEdit: () => void }) {
  return (
    <li>
      <button type="button" onClick={onEdit} className="hover:bg-accent focus-visible:ring-ring/50 grid w-full gap-1 rounded-md border px-3 py-2 text-left text-sm outline-none focus-visible:ring-[3px]">
        <span className="font-medium">{post.title}</span>
        <span className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary">{KIND_LABELS[post.kind as Kind]}</Badge>
          <Badge variant={STATUS_VARIANT[post.status as Status]}>{STATUS_LABELS[post.status as Status]}</Badge>
          {post.scheduled_time && <span className="tabular-nums">{post.scheduled_time}</span>}
          {post.visual_id && <span>has slides</span>}
        </span>
      </button>
    </li>
  )
}
