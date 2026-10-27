"use server"

import { z } from "zod"

import { requireSession } from "@/lib/auth"
import type {
  ActionResult,
  BeatSheet,
  CaptionResult,
  DetectResult,
  HookResult,
  HumanizeReport,
  HumanizeResult,
} from "@/lib/tool-types"
import { runTool } from "@/lib/tools"

const text = z.string().trim().min(1, "Paste some text first.").max(20_000, "That is over 20,000 characters.")

async function guarded<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    await requireSession()
    return { ok: true, data: await fn() }
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Invalid input." }
    console.error(e)
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }
  }
}

export async function scoreHooks(input: string) {
  return guarded(async () => {
    const raw = await runTool("hookscore", [], text.parse(input))
    // One hook comes back as an object, several as a list.
    const list = (Array.isArray(raw) ? raw : [raw]) as HookResult[]
    return list.sort((a, b) => b.score - a.score)
  })
}

export async function beatSheet(input: string, opts: { target?: number; wpm?: number }) {
  return guarded(async () => {
    const { target, wpm } = z
      .object({ target: z.number().positive().max(600).optional(), wpm: z.number().min(60).max(400).optional() })
      .parse(opts)
    const args = [...(target ? ["--target", String(target)] : []), ...(wpm ? ["--wpm", String(wpm)] : [])]
    return (await runTool("beats", args, text.parse(input))) as BeatSheet
  })
}

export async function lintCaption(input: string, keywords: string) {
  return guarded(async () => {
    const kw = z.string().max(500).parse(keywords).trim()
    return (await runTool("caption", kw ? ["--keywords", kw] : [], text.parse(input))) as CaptionResult
  })
}

export async function humanize(input: string): Promise<ActionResult<HumanizeResult>> {
  return guarded(async () => {
    const source = text.parse(input)
    const cleaned = (await runTool("humanize", [], source)) as { text: string; report: HumanizeReport }
    const [before, after] = (await Promise.all([
      runTool("detect", [], source),
      runTool("detect", [], cleaned.text),
    ])) as [DetectResult, DetectResult]
    return { ...cleaned, text: cleaned.text.trimEnd(), before, after }
  })
}
