import { z } from "zod"

import { HEX } from "@/lib/contrast"

// Safe for client and server: no imports that touch the database or the disk.

export const TONES = ["mist", "stone", "sand", "blush", "olive"] as const
export type Tone = (typeof TONES)[number]

export const TONE_LABELS: Record<Tone, string> = {
  mist: "Mist",
  stone: "Stone",
  sand: "Sand",
  blush: "Blush",
  olive: "Olive",
}

const hex = z.string().regex(HEX, "Use a 6-digit hex colour like #e0e0dc")

export const brandSchema = z.object({
  colors: z.object({ mist: hex, stone: hex, sand: hex, blush: hex, olive: hex }),
  ink: hex,
  paper: hex,
  handle: z.string().trim().regex(/^@?[A-Za-z0-9._]{0,30}$/, "Letters, numbers, dots and underscores only"),
  timezone: z.string().trim().min(1).max(60),
})
export type Brand = z.infer<typeof brandSchema>

// The law-of-attraction pastel palette. Olive is mid-tone, so it always takes
// dark text: white on #929272 is only 3.2:1, the ink reaches 5.2:1.
export const DEFAULT_BRAND: Brand = {
  colors: { mist: "#e0e0dc", stone: "#c7c1b7", sand: "#e8d6c0", blush: "#e2d5dd", olive: "#929272" },
  ink: "#1f1f1a",
  paper: "#fbfaf6",
  handle: "",
  timezone: "UTC",
}
