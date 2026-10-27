// Shapes of the --json output from the Python tools in ../skills.

export type Check = { score: number; detail: string }

export type HookResult = {
  hook: string
  checks: Record<string, Check>
  weakest: string
  flags: string[]
  score: number
  verdict: "STRONG" | "OK" | "WEAK" | string
}

export type Beat = {
  n: number
  start: number
  dur: number
  words: number
  text: string
  concrete: number
  label: string
  flags: string[]
}

export type BeatSheet = {
  wpm: number
  target: number | null
  total_seconds: number
  total_words: number
  beats: Beat[]
  notes: string[]
}

export type CaptionCheck = { check: string; status: "PASS" | "WARN" | "FAIL"; detail: string }

export type CaptionResult = {
  characters: number
  limit: number
  truncate_at: number
  visible: string
  truncated: boolean
  hashtags: string[]
  checks: CaptionCheck[]
  verdict?: string
}

export type HumanizeReport = {
  invisible: { name: string; count: number; action: string }[]
  typographic: { name: string; count: number; to: string }[]
  lexical: { find: string; replace: string; count: number; family: string }[]
  structures: { name: string; count: number; fix: string }[]
}

export type DetectResult = {
  checks: Record<string, Check>
  human_score: number
  verdict: string
}

export type HumanizeResult = {
  text: string
  report: HumanizeReport
  before: DetectResult
  after: DetectResult
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }
