import { z } from "zod"

import { TONES, type Tone } from "@/lib/brand-shared"

// The slide spec Claude fills in, and the editor edits. Pure: shared by client and server.

export const FORMATS = {
  post_portrait: { w: 1080, h: 1350, label: "Post portrait 4:5" },
  post_portrait_34: { w: 1080, h: 1440, label: "Post portrait 3:4" },
  square: { w: 1080, h: 1080, label: "Square 1:1" },
  story: { w: 1080, h: 1920, label: "Story / Reel 9:16" },
} as const
export type FormatId = keyof typeof FORMATS
export const FORMAT_IDS = Object.keys(FORMATS) as FormatId[]

export const LAYOUTS = ["cover", "statement", "list", "quote", "cta"] as const
export type Layout = (typeof LAYOUTS)[number]

export const LAYOUT_LABELS: Record<Layout, string> = {
  cover: "Cover",
  statement: "Statement",
  list: "List",
  quote: "Quote",
  cta: "Call to action",
}

const text = (max: number) => z.string().trim().max(max)

export const slideSchema = z.object({
  layout: z.enum(LAYOUTS),
  tone: z.enum(TONES).optional(),
  eyebrow: text(40).optional(),
  title: text(120).min(1, "Every slide needs a title"),
  body: text(320).optional(),
  items: z.array(text(100).min(1)).max(6).optional(),
  action: text(60).optional(),
})
export type Slide = z.infer<typeof slideSchema>

export const specSchema = z.object({
  format: z.enum(FORMAT_IDS as [FormatId, ...FormatId[]]),
  title: text(100).min(1),
  alt: text(400).optional(),
  caption: text(2200).optional(),
  slides: z.array(slideSchema).min(1).max(20),
})
export type SlideSpec = z.infer<typeof specSchema>

// Pastel rotation for the middle slides. Olive is held back for the call to
// action, where it should stand out.
const ROTATION: Tone[] = ["mist", "blush", "sand", "stone"]
export function toneFor(slide: Slide, index: number): Tone {
  if (slide.tone) return slide.tone
  if (slide.layout === "cover") return "sand"
  if (slide.layout === "cta") return "olive"
  return ROTATION[index % ROTATION.length]
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "slides"
}
