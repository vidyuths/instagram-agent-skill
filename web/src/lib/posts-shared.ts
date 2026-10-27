import { z } from "zod"

export const KINDS = ["reel", "carousel", "story", "post"] as const
export const STATUSES = ["idea", "drafted", "designed", "scheduled", "posted"] as const
export type Kind = (typeof KINDS)[number]
export type Status = (typeof STATUSES)[number]

export const KIND_LABELS: Record<Kind, string> = { reel: "Reel", carousel: "Carousel", story: "Story", post: "Post" }
export const STATUS_LABELS: Record<Status, string> = {
  idea: "Idea",
  drafted: "Drafted",
  designed: "Designed",
  scheduled: "Scheduled",
  posted: "Posted",
}

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-11-03")
  .refine((d) => {
    const parsed = new Date(`${d}T00:00:00Z`)
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(d)
  }, "That date does not exist")

export const postSchema = z.object({
  title: z.string().trim().min(1, "Give the post a title").max(120),
  kind: z.enum(KINDS),
  status: z.enum(STATUSES).default("idea"),
  scheduled_date: date.nullable().default(null),
  scheduled_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 18:30")
    .nullable()
    .default(null),
  caption: z.string().max(2200, "Instagram captions stop at 2,200 characters").default(""),
  notes: z.string().max(60_000).default(""),
  visual_id: z.number().int().positive().nullable().default(null),
})
export type PostFields = z.infer<typeof postSchema>

export function kindForSkill(skill: string): Kind {
  if (skill === "ig-reel") return "reel"
  if (skill === "ig-carousel") return "carousel"
  if (skill === "ig-story") return "story"
  return "post"
}
