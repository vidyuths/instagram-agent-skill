import { getBrand, todayIn } from "@/lib/brand"
import { getVisual, listPosts, listVisuals } from "@/lib/db"
import type { Kind, PostFields } from "@/lib/posts-shared"
import { specSchema } from "@/lib/slides"
import { CalendarView } from "./calendar-view"

export const dynamic = "force-dynamic"

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string; visual?: string }> }) {
  const sp = await searchParams
  const today = todayIn(getBrand().timezone)
  const month = sp.m && MONTH.test(sp.m) ? sp.m : today.slice(0, 7)

  // Arriving from a slide set: open a new post already filled in.
  let prefill: PostFields | null = null
  const visualId = Number(sp.visual)
  const visual = Number.isInteger(visualId) ? getVisual(visualId) : null
  if (visual) {
    const spec = specSchema.safeParse(JSON.parse(visual.spec))
    if (spec.success) {
      const kind: Kind = spec.data.format === "story" ? "story" : spec.data.slides.length > 1 ? "carousel" : "post"
      prefill = { title: spec.data.title, kind, status: "designed", scheduled_date: today, scheduled_time: null, caption: spec.data.caption ?? "", notes: "", visual_id: visual.id }
    }
  }

  const visuals = listVisuals().map((v) => ({ id: v.id, title: v.title, updated_at: v.updated_at }))
  return <CalendarView month={month} today={today} posts={listPosts()} visuals={visuals} prefill={prefill} />
}
