import "server-only"
import { z } from "zod"

import { getBrand } from "@/lib/brand"
import { TONES } from "@/lib/brand-shared"
import { addPost, createVisual, getVisual } from "@/lib/db"
import { KINDS, postSchema, STATUSES } from "@/lib/posts-shared"
import { analyzeSpec } from "@/lib/render"
import { readSkillJson } from "@/lib/skills"
import { FORMAT_IDS, LAYOUTS, specSchema } from "@/lib/slides"
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
  // Something for the UI to show when the tool succeeds, besides the model's result.
  event?: (output: unknown) => ToolEvent | undefined
}
export type ToolEvent =
  | { t: "visual"; id: number; title: string; format: string; count: number; v: string; warnings: string[] }
  | { t: "calendar"; count: number }

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
  def({
    name: "design_slides",
    description:
      "Draw slides as images in the user's brand colours and fonts. Use it for carousels, Story frames, and Reel covers or on-screen text cards, once the copy is settled. The app renders the PNGs and shows them to the user with edit and download. Returns the visual_id and any layout warnings: fix warnings by shortening text and calling again.",
    input_schema: {
      type: "object",
      properties: {
        format: {
          type: "string",
          enum: FORMAT_IDS,
          description: "post_portrait is 1080x1350 (4:5, the default for carousels). post_portrait_34 is 1080x1440. square is 1080x1080. story is 1080x1920 for Stories and Reel covers.",
        },
        title: { type: "string", description: "A short name for this set, for the library." },
        alt: { type: "string", description: "Alt text for the cover slide, one or two sentences." },
        caption: { type: "string", description: "The final caption for the post, if there is one." },
        slides: {
          type: "array",
          description: "One entry per slide, in order. Carousels run 6 to 10 slides.",
          items: {
            type: "object",
            properties: {
              layout: { type: "string", enum: LAYOUTS, description: "cover for slide 1, statement for one idea, list for steps or a recap (use items), quote, cta for the last slide." },
              tone: { type: "string", enum: TONES, description: "Background colour. Leave out to let the app rotate the palette." },
              eyebrow: { type: "string", description: "A tiny label above the title, 40 characters at most." },
              title: { type: "string", description: "The headline. Covers: 6 words or fewer." },
              body: { type: "string", description: "Supporting text, 25 words at most. On a quote slide this is the attribution." },
              items: { type: "array", items: { type: "string" }, description: "List items, up to 6, for the list layout." },
              action: { type: "string", description: "The one action on a cta slide, e.g. 'Comment CALM' or 'Save this'." },
            },
            required: ["layout", "title"],
            additionalProperties: false,
          },
        },
      },
      required: ["format", "title", "slides"],
      additionalProperties: false,
    },
    schema: specSchema,
    run: async (spec) => {
      const warnings = analyzeSpec(spec, getBrand())
      const id = createVisual(spec.title, spec.format, JSON.stringify(spec))
      const row = getVisual(id)
      return { visual_id: id, slides: spec.slides.length, warnings, v: row?.updated_at ?? "", title: spec.title, format: spec.format }
    },
    event: (out) => {
      const o = out as { visual_id: number; slides: number; warnings: string[]; v: string; title: string; format: string }
      return { t: "visual", id: o.visual_id, title: o.title, format: o.format, count: o.slides, v: o.v, warnings: o.warnings }
    },
  }),
  def({
    name: "add_to_calendar",
    description:
      "Put planned posts on the user's content calendar. Only call this when the user asks you to, or agrees to your offer. Use real dates on or after today. Link a post to a slide set with visual_id when there is one.",
    input_schema: {
      type: "object",
      properties: {
        posts: {
          type: "array",
          maxItems: 14,
          items: {
            type: "object",
            properties: {
              date: { type: "string", description: "YYYY-MM-DD" },
              time: { type: "string", description: "HH:MM, 24 hour, optional." },
              kind: { type: "string", enum: KINDS },
              status: { type: "string", enum: STATUSES, description: "idea if only planned, drafted if the copy exists, designed if images exist." },
              title: { type: "string" },
              caption: { type: "string", description: "The caption, if written." },
              notes: { type: "string", description: "The script, shot list or brief, short." },
              visual_id: { type: "number", description: "From design_slides, if images were made for this post." },
            },
            required: ["date", "kind", "title"],
            additionalProperties: false,
          },
        },
      },
      required: ["posts"],
      additionalProperties: false,
    },
    schema: z.object({
      posts: z
        .array(
          z.object({
            date: postSchema.shape.scheduled_date.unwrap(),
            time: postSchema.shape.scheduled_time.unwrap().optional(),
            kind: postSchema.shape.kind,
            status: postSchema.shape.status.optional(),
            title: postSchema.shape.title,
            caption: postSchema.shape.caption.optional(),
            notes: postSchema.shape.notes.optional(),
            visual_id: postSchema.shape.visual_id.unwrap().optional(),
          }),
        )
        .min(1)
        .max(14),
    }),
    run: async ({ posts }) => {
      const added: number[] = []
      const warnings: string[] = []
      for (const p of posts) {
        const visual = p.visual_id && getVisual(p.visual_id) ? p.visual_id : null
        if (p.visual_id && !visual) warnings.push(`visual_id ${p.visual_id} does not exist; "${p.title}" was added without images.`)
        added.push(
          addPost({
            title: p.title,
            kind: p.kind,
            status: p.status ?? (visual ? "designed" : p.caption || p.notes ? "drafted" : "idea"),
            scheduled_date: p.date,
            scheduled_time: p.time ?? null,
            caption: p.caption ?? "",
            notes: p.notes ?? "",
            visual_id: visual,
          }),
        )
      }
      return { added: added.length, warnings }
    },
    event: (out) => ({ t: "calendar", count: (out as { added: number }).added }),
  }),
]

export const TOOL_LABELS: Record<string, string> = {
  score_hooks: "Scoring hooks",
  beat_sheet: "Timing the script",
  check_caption: "Checking the caption",
  humanize: "Cleaning the draft",
  detect_ai: "Scoring the draft",
  get_reference: "Reading the reference",
  design_slides: "Drawing the slides",
  add_to_calendar: "Adding to the calendar",
}

export async function executeTool(name: string, input: unknown): Promise<{ content: string; isError: boolean; event?: ToolEvent }> {
  const tool = STUDIO_TOOLS.find((t) => t.name === name)
  if (!tool) return { content: `Unknown tool: ${name}`, isError: true }
  const parsed = tool.schema.safeParse(input)
  if (!parsed.success) {
    return { content: `Invalid input: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`, isError: true }
  }
  try {
    const out = await (tool.run as (i: unknown) => Promise<unknown>)(parsed.data)
    return { content: JSON.stringify(out), isError: false, event: tool.event?.(out) }
  } catch (e) {
    return { content: e instanceof Error ? e.message : "Tool failed", isError: true }
  }
}
