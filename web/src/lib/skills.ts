import "server-only"
import fs from "node:fs"
import path from "node:path"

export const SKILLS_DIR = process.env.SKILLS_DIR ?? path.resolve(process.cwd(), "..", "skills")

// Skills that need Claude as the writer, with a label and what to paste in.
// ig-human and the scoring scripts are the Tools page; ig-viral needs live
// browsing of Instagram, which a web app does not do.
export const STUDIO_SKILLS = [
  { id: "ig-reel", label: "Reel", hint: "One raw idea, plus who it is for and what happened." },
  { id: "ig-caption", label: "Caption", hint: "The post or reel it goes with, and the one thing it should make people do." },
  { id: "ig-carousel", label: "Carousel", hint: "The topic or a draft, and the one takeaway." },
  { id: "ig-story", label: "Stories", hint: "What is happening today and what you want from viewers." },
  { id: "ig-plan", label: "Weekly plan", hint: "Your goal this week, what you have to say, and how much time you have." },
  { id: "ig-repurpose", label: "Repurpose", hint: "Paste a transcript, newsletter or notes to turn into a week of posts." },
  { id: "ig-profile", label: "Profile score", hint: "Paste your name, bio, link, highlights and pinned posts." },
  { id: "ig-audit", label: "Audit", hint: "Paste your recent posts with views, saves, shares and follows." },
  { id: "ig-comment", label: "Comments", hint: "Paste the post you want to comment on." },
  { id: "ig-reply", label: "Replies", hint: "Paste your post and the comments under it." },
  { id: "ig-dm", label: "DMs", hint: "Say which kind: keyword delivery, first message, collab pitch or follow-up." },
] as const

export type StudioSkillId = (typeof STUDIO_SKILLS)[number]["id"]

export function isStudioSkill(id: string): id is StudioSkillId {
  return STUDIO_SKILLS.some((s) => s.id === id)
}

// The instructions without the YAML frontmatter.
export function skillBody(id: StudioSkillId) {
  const raw = fs.readFileSync(path.join(SKILLS_DIR, id, "SKILL.md"), "utf8")
  return raw.replace(/^---\n[\s\S]*?\n---\n/, "").trim()
}

export function readSkillJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(SKILLS_DIR, file), "utf8"))
}

export function voiceTemplate() {
  return fs.readFileSync(path.join(SKILLS_DIR, "..", "templates", "voice.md"), "utf8")
}
