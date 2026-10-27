import { listDrafts } from "@/lib/db"
import { STUDIO_SKILLS } from "@/lib/skills"
import { DraftList } from "./draft-list"

export const dynamic = "force-dynamic"

export default function LibraryPage() {
  const labels = Object.fromEntries(STUDIO_SKILLS.map((s) => [s.id, s.label]))
  const drafts = listDrafts().map((d) => ({ ...d, skillLabel: labels[d.skill] ?? d.skill }))
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold">Library</h1>
        <p className="text-muted-foreground text-sm">Drafts you saved from the Studio.</p>
      </div>
      <DraftList drafts={drafts} />
    </div>
  )
}
