"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { CalendarPlus, Check } from "lucide-react"

import { savePost } from "@/app/(app)/data-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { KIND_LABELS, KINDS, kindForSkill, postSchema, type Kind } from "@/lib/posts-shared"

// Puts a Studio reply on the calendar as a post, with the reply as its notes.
export function AddToCalendar({
  skill,
  today,
  title,
  content,
  visualId,
}: {
  skill: string
  today: string
  title: string
  content: string
  visualId: number | null
}) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [name, setName] = useState(title)
  const [kind, setKind] = useState<Kind>(kindForSkill(skill))
  const [date, setDate] = useState(today)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  if (done) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm">
        <Check className="size-4" /> Added to the calendar.{" "}
        <Link href={`/calendar?m=${date.slice(0, 7)}`} className="font-medium underline underline-offset-2">
          Open calendar
        </Link>
      </p>
    )
  }
  if (!open) {
    return (
      <div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <CalendarPlus /> Add to calendar
        </Button>
      </div>
    )
  }
  return (
    <form
      className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_8rem_9rem_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault()
        const parsed = postSchema.safeParse({
          title: name,
          kind,
          status: visualId ? "designed" : "drafted",
          scheduled_date: date || null,
          scheduled_time: null,
          caption: "",
          notes: content.slice(0, 60_000),
          visual_id: visualId,
        })
        if (!parsed.success) return setError(parsed.error.issues[0].message)
        start(async () => {
          const res = await savePost(null, parsed.data)
          if (res.ok) setDone(true)
          else setError(res.error)
        })
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="ac-title">Title</Label>
        <Input id="ac-title" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ac-kind">Format</Label>
        <NativeSelect id="ac-kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ac-date">Date</Label>
        <Input id="ac-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding..." : "Add"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm sm:col-span-4">
          {error}
        </p>
      )}
    </form>
  )
}
