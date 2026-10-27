import "server-only"
import Anthropic from "@anthropic-ai/sdk"

import { getBrand, todayIn } from "@/lib/brand"
import { executeTool, STUDIO_TOOLS, TOOL_LABELS, type ToolEvent } from "@/lib/claude-tools"
import { getSetting } from "@/lib/db"
import { skillBody, type StudioSkillId } from "@/lib/skills"

export const MODELS = {
  "claude-opus-5-5": { label: "Opus 5.5", note: "Best writing. $4 / $20 per million tokens.", input: 4, output: 20 },
  "claude-sonnet-5-5": { label: "Sonnet 5.5", note: "Faster and half the price.", input: 2, output: 10 },
} as const
export type ModelId = keyof typeof MODELS
export const DEFAULT_MODEL: ModelId = "claude-opus-5-5"

export type ChatMessage = { role: "user" | "assistant"; content: string }

export type StudioEvent =
  | { t: "text"; d: string }
  | { t: "tool"; name: string; label: string; state: "start" | "done" | "error" }
  | ToolEvent
  | { t: "done"; model: string; inputTokens: number; outputTokens: number; costUsd: number }
  | { t: "error"; message: string }

const MAX_TURNS = 8
const MAX_TOKENS = 32_000

const PREAMBLE = `You are the writing engine inside IG Studio, a private web app for one Instagram creator. Follow the skill below. It was written for Claude Code, so these things differ here:

- There is no shell and there are no files. Where the skill says to run hookscore.py, beats.py, caption.py, humanize.py or detect.py, call the matching tool instead (score_hooks, beat_sheet, check_caption, humanize, detect_ai) and report what it returns. Never estimate a score you could get from a tool.
- Where the skill says to read hooks.json or rubric.json, call get_reference.
- The user's voice profile (voice.md) is below, if they have saved one. Saved files such as swipe.md are not available here, so do not say you read them.
- You cannot browse Instagram, scrape it, or post anything. Finish with copy-ready text and the user posts it.
- Never invent a number, client, result or story. Use {{your number}} where the skill says to, and flag it.
- You cannot make video files. For video, describe each shot, the on-screen text and the timing.
- You can draw images with design_slides: carousel slides, Story frames, and Reel covers or on-screen text cards. The app draws them in the user's brand colours and fonts, so never describe colours or fonts. Call it with the approved copy (format post_portrait for carousels, story for Stories and Reel covers). Use cover first, statement, list or quote in the middle, and cta last; keep titles short and body text under 25 words. Put the caption in "caption" and the cover's alt text in "alt". If the user already asked for images, call it right after the copy; otherwise finish by offering to make the images. After it returns, mention any warnings. The user edits and downloads the slides from a card under your reply.
- When the user asks to put posts on the calendar, or agrees to your offer, call add_to_calendar with real dates (today's date is at the end of this prompt). Never add to the calendar unprompted.
- Answer in Markdown. Put anything the user will copy into a fenced code block. Do not narrate tool calls.`

export function buildSystem(skill: StudioSkillId) {
  const voice = getSetting("voice")?.trim()
  const voiceBlock = voice
    ? `## The user's voice profile (voice.md)\n\n${voice}`
    : `## The user's voice profile (voice.md)\n\nNone saved yet. Ask for three of their own reels or captions before writing anything long, or write in a neutral voice and say so.`
  return `${PREAMBLE}\n\n# Skill: ${skill}\n\n${skillBody(skill)}\n\n${voiceBlock}`
}

// Kept out of the cached block: it changes every day.
function todayBlock() {
  const tz = getBrand().timezone
  return `Today is ${todayIn(tz)} (${tz}).`
}

function cost(model: ModelId, input: number, output: number, cacheRead: number, cacheWrite: number) {
  const p = MODELS[model]
  return (input * p.input + output * p.output + cacheRead * p.input * 0.1 + cacheWrite * p.input * 1.25) / 1_000_000
}

export async function* runStudio(opts: {
  skill: StudioSkillId
  model: ModelId
  messages: ChatMessage[]
  signal?: AbortSignal
}): AsyncGenerator<StudioEvent> {
  if (!process.env.ANTHROPIC_API_KEY) {
    yield { t: "error", message: "ANTHROPIC_API_KEY is not set on the server." }
    return
  }
  const client = new Anthropic({ maxRetries: 2 })
  const system = buildSystem(opts.skill)
  const tools = STUDIO_TOOLS.map(({ name, description, input_schema }) => ({
    name,
    description,
    input_schema,
    eager_input_streaming: true,
  }))
  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = opts.messages.map((m) => ({ role: m.role, content: m.content }))

  let inputTokens = 0
  let outputTokens = 0
  let cacheRead = 0
  let cacheWrite = 0
  let jsonRetries = 0
  let wroteText = false

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const stream = client.beta.messages.stream(
      {
        model: opts.model,
        max_tokens: MAX_TOKENS,
        system: [
          { type: "text", text: system, cache_control: { type: "ephemeral" } },
          { type: "text", text: todayBlock() },
        ],
        tools,
        messages,
        output_config: { effort: "medium" },
        // Route a policy decline to a fallback model inside the same call.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      },
      { signal: opts.signal },
    )

    // Text is queued by the stream handler and drained here, so the generator can yield it.
    const queue: string[] = []
    let turnHasText = false
    let wake: (() => void) | null = null
    stream.on("text", (delta) => {
      queue.push(delta)
      wake?.()
    })
    const finished = stream.finalMessage().then(
      (m) => ({ ok: true as const, m }),
      (e: unknown) => ({ ok: false as const, e }),
    )
    let done = false
    void finished.then(() => {
      done = true
      wake?.()
    })
    while (!done || queue.length) {
      if (queue.length) {
        // Text from before a tool call and text from after it are separate paragraphs.
        const chunk = queue.splice(0).join("")
        yield { t: "text", d: wroteText && !turnHasText ? "\n\n" + chunk : chunk }
        wroteText = true
        turnHasText = true
        continue
      }
      await new Promise<void>((resolve) => (wake = resolve))
      wake = null
    }

    const result = await finished
    if (!result.ok) {
      if (result.e instanceof Anthropic.APIError || jsonRetries++ >= 2) {
        const e = result.e
        yield { t: "error", message: e instanceof Anthropic.APIError ? `Claude API error ${e.status ?? ""}: ${e.message}` : "The model returned a broken tool call." }
        return
      }
      continue
    }
    jsonRetries = 0
    const message = result.m
    inputTokens += message.usage.input_tokens
    outputTokens += message.usage.output_tokens
    cacheRead += message.usage.cache_read_input_tokens ?? 0
    cacheWrite += message.usage.cache_creation_input_tokens ?? 0

    if (message.stop_reason === "refusal") {
      yield { t: "error", message: "The model declined this request." }
      break
    }
    const toolUses = message.content.filter((b): b is Anthropic.Beta.Messages.BetaToolUseBlock => b.type === "tool_use")
    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content })
      continue
    }
    if (message.stop_reason === "max_tokens" && toolUses.length) {
      // A tool input cut off at max_tokens can still parse; never run it.
      yield { t: "error", message: "The reply was cut off. Ask for a shorter piece, or split the request." }
      break
    }
    if (message.stop_reason === "max_tokens") {
      yield { t: "text", d: "\n\n_(The reply hit the length limit.)_" }
      break
    }
    if (!toolUses.length) break

    messages.push({ role: "assistant", content: message.content })
    const results: Anthropic.Beta.Messages.BetaToolResultBlockParam[] = []
    for (const use of toolUses) {
      const label = TOOL_LABELS[use.name] ?? use.name
      yield { t: "tool", name: use.name, label, state: "start" }
      const out = await executeTool(use.name, use.input)
      yield { t: "tool", name: use.name, label, state: out.isError ? "error" : "done" }
      if (out.event) yield out.event
      results.push({ type: "tool_result", tool_use_id: use.id, content: out.content, ...(out.isError ? { is_error: true } : {}) })
    }
    messages.push({ role: "user", content: results })
    if (turn === MAX_TURNS - 1) yield { t: "error", message: "Stopped after too many tool calls." }
  }

  yield {
    t: "done",
    model: opts.model,
    inputTokens: inputTokens + cacheRead + cacheWrite,
    outputTokens,
    costUsd: cost(opts.model, inputTokens, outputTokens, cacheRead, cacheWrite),
  }
}
