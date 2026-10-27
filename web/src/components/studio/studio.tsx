"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { BookmarkPlus, Check, Download, Image as ImageIcon, Loader2, Pencil, Square, TriangleAlert } from "lucide-react"

import { saveDraft } from "@/app/(app)/data-actions"
import { Markdown } from "@/components/markdown"
import { SlideImage } from "@/components/slide-image"
import { AddToCalendar } from "@/components/studio/add-to-calendar"
import { CopyButton } from "@/components/tools/shared"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { FORMATS, type FormatId } from "@/lib/slides"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type Skill = { id: string; label: string; hint: string }
type Model = { id: string; label: string; note: string }
type ToolChip = { name: string; label: string; state: "start" | "done" | "error" }
type Meta = { model: string; inputTokens: number; outputTokens: number; costUsd: number }
type VisualCard = { id: number; title: string; format: string; count: number; v: string; warnings: string[] }
type Msg =
  | { role: "user"; content: string }
  | {
      role: "assistant"
      content: string
      tools: ToolChip[]
      visuals: VisualCard[]
      calendar?: number
      meta?: Meta
      error?: string
      saved?: boolean
      streaming?: boolean
    }

// Skills whose output can be drawn as slides.
const IMAGE_SKILLS = new Set(["ig-carousel", "ig-story", "ig-reel", "ig-repurpose"])

type Event =
  | { t: "text"; d: string }
  | { t: "tool"; name: string; label: string; state: "start" | "done" | "error" }
  | ({ t: "visual" } & VisualCard)
  | { t: "calendar"; count: number }
  | ({ t: "done" } & Meta)
  | { t: "error"; message: string }

export function Studio({ skills, models, defaultModel, today }: { skills: Skill[]; models: Model[]; defaultModel: string; today: string }) {
  const [skill, setSkill] = useState(skills[0].id)
  const [model, setModel] = useState(defaultModel)
  const [input, setInput] = useState("")
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const current = skills.find((s) => s.id === skill) ?? skills[0]

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [msgs])

  function reset(next?: string) {
    abort.current?.abort()
    setMsgs([])
    setBusy(false)
    if (next) setSkill(next)
  }

  function patchLast(fn: (m: Extract<Msg, { role: "assistant" }>) => Extract<Msg, { role: "assistant" }>) {
    setMsgs((all) => {
      const last = all[all.length - 1]
      return last?.role === "assistant" ? [...all.slice(0, -1), fn(last)] : all
    })
  }

  async function send(override?: string) {
    const text = (override ?? input).trim()
    if (!text || busy) return
    const history = msgs
      .filter((m) => m.content.trim())
      .map((m) => ({ role: m.role, content: m.content }))
    if (override === undefined) setInput("")
    setBusy(true)
    setMsgs((all) => [...all, { role: "user", content: text }, { role: "assistant", content: "", tools: [], visuals: [], streaming: true }])
    const controller = new AbortController()
    abort.current = controller
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill, model, messages: [...history, { role: "user", content: text }] }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error ?? `Request failed (${res.status})`)
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let nl: number
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim()
          buffer = buffer.slice(nl + 1)
          if (!line) continue
          const ev = JSON.parse(line) as Event
          if (ev.t === "text") patchLast((m) => ({ ...m, content: m.content + ev.d }))
          else if (ev.t === "tool")
            patchLast((m) => {
              const rest = m.tools.filter((t) => !(t.name === ev.name && t.state === "start"))
              return { ...m, tools: [...rest, { name: ev.name, label: ev.label, state: ev.state }] }
            })
          else if (ev.t === "visual") patchLast((m) => ({ ...m, visuals: [...m.visuals, ev] }))
          else if (ev.t === "calendar") patchLast((m) => ({ ...m, calendar: (m.calendar ?? 0) + ev.count }))
          else if (ev.t === "done") patchLast((m) => ({ ...m, meta: ev }))
          else if (ev.t === "error") patchLast((m) => ({ ...m, error: ev.message }))
        }
      }
    } catch (e) {
      if (!controller.signal.aborted) patchLast((m) => ({ ...m, error: e instanceof Error ? e.message : "Request failed" }))
    } finally {
      patchLast((m) => ({ ...m, streaming: false }))
      setBusy(false)
    }
  }

  async function save(index: number) {
    const m = msgs[index]
    const prompt = [...msgs.slice(0, index)].reverse().find((x) => x.role === "user")?.content ?? current.label
    if (m.role !== "assistant") return
    const title = `${current.label}: ${prompt.replace(/\s+/g, " ").slice(0, 70)}`
    const res = await saveDraft(skill, title, m.content)
    if (res.ok) setMsgs((all) => all.map((x, i) => (i === index && x.role === "assistant" ? { ...x, saved: true } : x)))
    else alert(res.error)
  }

  return (
    <div className="grid gap-4">
      <h1 className="sr-only">Studio</h1>
      <div role="radiogroup" aria-label="Skill" className="flex flex-wrap gap-2">
        {skills.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={s.id === skill}
            onClick={() => s.id !== skill && reset(s.id)}
            className={cn(
              "focus-visible:ring-ring/50 rounded-full border px-3 py-1.5 text-sm font-medium outline-none focus-visible:ring-[3px]",
              s.id === skill ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-muted-foreground text-sm">{current.hint}</p>
        <div className="flex items-center gap-2">
          <Label htmlFor="model" className="text-muted-foreground text-xs">
            Model
          </Label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="border-input bg-background focus-visible:ring-ring/50 h-8 rounded-md border px-2 text-sm outline-none focus-visible:ring-[3px]"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          {msgs.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => reset()}>
              New chat
            </Button>
          )}
        </div>
      </div>

      <ol className="grid gap-4" aria-live="polite">
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <li key={i} className="bg-secondary ml-auto max-w-[85%] rounded-xl px-4 py-2.5 text-sm break-words whitespace-pre-wrap">
              {m.content}
            </li>
          ) : (
            <li key={i} className="grid gap-2">
              {m.tools.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.tools.map((t, j) => (
                    <Badge key={j} variant={t.state === "error" ? "destructive" : "outline"}>
                      {t.state === "start" ? <Loader2 className="animate-spin" /> : t.state === "done" ? <Check /> : <TriangleAlert />}
                      {t.label}
                    </Badge>
                  ))}
                </div>
              )}
              {m.content ? (
                <Markdown>{m.content}</Markdown>
              ) : (
                m.streaming &&
                !m.error && (
                  <p className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Loader2 className="size-4 animate-spin" /> Writing...
                  </p>
                )
              )}
              {m.error && (
                <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                  {m.error}
                </p>
              )}
              {!m.streaming && m.content && (
                <div className="flex flex-wrap items-center gap-2">
                  <CopyButton text={m.content} />
                  <Button variant="outline" size="sm" disabled={m.saved} onClick={() => save(i)}>
                    {m.saved ? <Check /> : <BookmarkPlus />}
                    {m.saved ? "Saved" : "Save"}
                  </Button>
                  {IMAGE_SKILLS.has(skill) && m.visuals.length === 0 && i === msgs.length - 1 && (
                    <Button variant="outline" size="sm" disabled={busy} onClick={() => void send("Make the images for this.")}>
                      <ImageIcon /> Make images
                    </Button>
                  )}
                  {m.meta && (
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {m.meta.inputTokens.toLocaleString()} in · {m.meta.outputTokens.toLocaleString()} out · ~${m.meta.costUsd.toFixed(3)}
                    </span>
                  )}
                </div>
              )}
              {m.visuals.map((v) => (
                <section key={v.id} aria-label={`Slides: ${v.title}`} className="grid gap-3 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{v.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {FORMATS[v.format as FormatId]?.label ?? v.format} · {v.count} slides
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/visuals/${v.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        <Pencil /> Edit
                      </Link>
                      <a href={`/api/visuals/${v.id}/zip`} className={buttonVariants({ variant: "default", size: "sm" })}>
                        <Download /> Download all
                      </a>
                    </div>
                  </div>
                  <ul tabIndex={0} aria-label={`Slides of ${v.title}, scroll sideways`} className="focus-visible:ring-ring/50 flex gap-2 overflow-x-auto rounded-md pb-1 outline-none focus-visible:ring-[3px]">
                    {Array.from({ length: Math.min(v.count, 10) }, (_, n) => (
                      <li key={n} className="w-32 shrink-0">
                        <SlideImage src={`/api/visuals/${v.id}/${n + 1}?v=${encodeURIComponent(v.v)}`} alt={`Slide ${n + 1} of ${v.title}`} />
                      </li>
                    ))}
                  </ul>
                  {v.warnings.length > 0 && (
                    <ul className="bg-warning/15 list-disc rounded-md px-6 py-2 text-sm">
                      {v.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
              {m.calendar ? (
                <p role="status" className="bg-success/10 rounded-md px-3 py-2 text-sm">
                  Added {m.calendar} {m.calendar === 1 ? "post" : "posts"} to the calendar.{" "}
                  <Link href="/calendar" className="font-medium underline underline-offset-2">
                    Open calendar
                  </Link>
                </p>
              ) : null}
              {!m.streaming && m.content && !m.calendar && (
                <AddToCalendar
                  skill={skill}
                  today={today}
                  title={`${current.label}: ${([...msgs.slice(0, i)].reverse().find((x) => x.role === "user")?.content ?? "").replace(/\s+/g, " ").slice(0, 70)}`}
                  content={m.content}
                  visualId={m.visuals[0]?.id ?? null}
                />
              )}
            </li>
          ),
        )}
      </ol>
      <div ref={endRef} />

      <form
        className="bg-background sticky bottom-0 grid gap-2 border-t py-3"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <Label htmlFor="prompt" className="sr-only">
          Message
        </Label>
        <Textarea
          id="prompt"
          rows={4}
          value={input}
          placeholder={msgs.length ? "Reply, or ask for changes..." : "Describe what you need..."}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              void send()
            }
          }}
        />
        <div className="flex items-center gap-3">
          {busy ? (
            <Button type="button" variant="outline" onClick={() => abort.current?.abort()}>
              <Square /> Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim()}>
              Send
            </Button>
          )}
          <span className="text-muted-foreground hidden text-xs sm:inline">Ctrl or ⌘ + Enter to send</span>
        </div>
      </form>
    </div>
  )
}
