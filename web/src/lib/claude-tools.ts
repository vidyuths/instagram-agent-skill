import "server-only"
import { z } from "zod"

import { readSkillJson } from "@/lib/skills"
import { runTool } from "@/lib/tools"

// Tools Claude can call in the Studio. Each one wraps a Python script in
// ../skills, so the numbers the model reports are the same ones the Tools page
// shows. Inputs are validated with zod before anything runs: the model's tool
// input is untrusted output.

const text = z.string().min(1).max(20_000)

type ToolDef = {
  name: string
  description: string
  input_schema: { type: "object"; properties: Record<string, unknown>; required: string[]; additionalProperties: false }
  schema: z.ZodType
  run: (input: never) => Promise<unknown>
}

function def<S extends z.ZodType>(
  d: Omit<ToolDef, "schema" | "run"> & { schema: S; run: (input: z.infer<S>) => Promise<unknown> },
): ToolDef {
  return d as unknown as ToolDef
}

const HOOK_REFERENCE_DROP = new Set(["match"])

export const STUDIO_TOOLS: ToolDef[] = [
  def({
    name: "score_hooks",
    description:
      "Score and rank Reel hook options on five checks (length, specificity, stakes, frontload, address). Use it before recommending a hook; report the scores it returns, do not estimate them. Returns every hook ranked, with the weakest check and any dealbreaker.",
    input_schema: {
      type: "object",
      properties: { hooks: { type: "array", items: { type: "string" }, description: "The spoken hook lines to score, one per entry." } },
      required: ["hooks"],
      additionalProperties: false,
    },
    schema: z.object({ hooks: z.array(z.string().min(1).max(500)).min(1).max(20) }),
    run: async ({ hooks }) => runTool("hookscore", [], hooks.map((h) => h.replace(/\s+/g, " ")).join("\n")),
  }),
  def({
    name: "beat_sheet",
    description:
      "Time a spoken Reel script into a beat sheet: seconds per line, the hook, and warnings for slow beats, filler runs and a missing loop. Pass one beat per line.",
    input_schema: {
      type: "object",
      properties: {
        script: { type: "string", description: "The spoken script, one beat per line." },
        target_seconds: { type: "number", description: "Target length in seconds, if the user has one." },
        wpm: { type: "number", description: "Speaking rate in words per minute, if the voice profile gives one." },
      },
      required: ["script"],
      additionalProperties: false,
    },
    schema: z.object({
      script: text,
      target_seconds: z.number().positive().max(600).optional(),
      wpm: z.number().min(60).max(400).optional(),
    }),
    run: async ({ script, target_seconds, wpm }) =>
      runTool(
        "beats",
        [...(target_seconds ? ["--target", String(target_seconds)] : []), ...(wpm ? ["--wpm", String(wpm)] : [])],
        script,
      ),
  }),
  def({
    name: "check_caption",
    description:
      "Lint an Instagram caption: shows what the feed displays before '... more', checks the first line, hashtag cap, links, number of asks and emoji density. Run it on every caption before presenting it.",
    input_schema: {
      type: "object",
      properties: {
        caption: { type: "string", description: "The full caption text." },
        keywords: { type: "array", items: { type: "string" }, description: "Search terms the post should be found for, if any." },
      },
      required: ["caption"],
      additionalProperties: false,
    },
    schema: z.object({ caption: text, keywords: z.array(z.string().max(80)).max(10).optional() }),
    run: async ({ caption, keywords }) =>
      runTool("caption", keywords?.length ? ["--keywords", keywords.join(",")] : [], caption),
  }),
  def({
    name: "humanize",
    description:
      "Clean a draft: strips invisible characters, em dashes and stock AI phrases, and flags structures that need a rewrite. Returns the cleaned text plus a report. Run it on final copy before presenting it, and rewrite anything under 'structures' yourself.",
    input_schema: {
      type: "object",
      properties: { text: { type: "string", description: "The draft to clean." } },
      required: ["text"],
      additionalProperties: false,
    },
    schema: z.object({ text }),
    run: async ({ text: draft }) => runTool("humanize", [], draft),
  }),
  def({
    name: "detect_ai",
    description:
      "Score how human a draft reads on five local checks (burstiness, specificity, slop density, fingerprint, voice). Not a third-party detector. Use it to check a rewrite improved.",
    input_schema: {
      type: "object",
      properties: { text: { type: "string", description: "The text to score." } },
      required: ["text"],
      additionalProperties: false,
    },
    schema: z.object({ text }),
    run: async ({ text: draft }) => runTool("detect", [], draft),
  }),
  def({
    name: "get_reference",
    description:
      "Read a reference file from the skill pack. 'hook_formulas' is the 26 Reel hook formulas (template, example, on-screen line, best use, trap). 'profile_rubric' is the 100-point Instagram profile rubric.",
    input_schema: {
      type: "object",
      properties: { name: { type: "string", enum: ["hook_formulas", "profile_rubric"] } },
      required: ["name"],
      additionalProperties: false,
    },
    schema: z.object({ name: z.enum(["hook_formulas", "profile_rubric"]) }),
    run: async ({ name }) => {
      if (name === "profile_rubric") return readSkillJson("ig-profile/rubric.json")
      const hooks = readSkillJson("ig-reel/hooks.json") as { rules: string[]; hooks: Record<string, unknown>[] }
      return {
        rules: hooks.rules,
        hooks: hooks.hooks.map((h) => Object.fromEntries(Object.entries(h).filter(([k]) => !HOOK_REFERENCE_DROP.has(k)))),
      }
    },
  }),
]

export const TOOL_LABELS: Record<string, string> = {
  score_hooks: "Scoring hooks",
  beat_sheet: "Timing the script",
  check_caption: "Checking the caption",
  humanize: "Cleaning the draft",
  detect_ai: "Scoring the draft",
  get_reference: "Reading the reference",
}

export async function executeTool(name: string, input: unknown): Promise<{ content: string; isError: boolean }> {
  const tool = STUDIO_TOOLS.find((t) => t.name === name)
  if (!tool) return { content: `Unknown tool: ${name}`, isError: true }
  const parsed = tool.schema.safeParse(input)
  if (!parsed.success) {
    return { content: `Invalid input: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`, isError: true }
  }
  try {
    const out = await (tool.run as (i: unknown) => Promise<unknown>)(parsed.data)
    return { content: JSON.stringify(out), isError: false }
  } catch (e) {
    return { content: e instanceof Error ? e.message : "Tool failed", isError: true }
  }
}
