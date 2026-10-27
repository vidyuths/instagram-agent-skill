import Link from "next/link"

import { listDrafts, listVisuals } from "@/lib/db"
import { STUDIO_SKILLS } from "@/lib/skills"
import { specSchema } from "@/lib/slides"
import { cn } from "@/lib/utils"
import { DraftList } from "./draft-list"
import { VisualList } from "./visual-list"

export const dynamic = "force-dynamic"

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab = (await searchParams).tab === "visuals" ? "visuals" : "drafts"
  const labels = Object.fromEntries(STUDIO_SKILLS.map((s) => [s.id, s.label]))
  const drafts = listDrafts().map((d) => ({ ...d, skillLabel: labels[d.skill] ?? d.skill }))
  const visuals = listVisuals().flatMap((v) => {
    const spec = specSchema.safeParse(JSON.parse(v.spec))
    return spec.success ? [{ id: v.id, title: v.title, format: spec.data.format, count: spec.data.slides.length, cover: spec.data.slides[0].title, updated_at: v.updated_at, created_at: v.created_at }] : []
  })
  const tabs = [
    { id: "drafts", label: `Drafts (${drafts.length})`, href: "/library" },
    { id: "visuals", label: `Visuals (${visuals.length})`, href: "/library?tab=visuals" },
  ]
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold">Library</h1>
        <p className="text-muted-foreground text-sm">Replies you saved, and the slide sets the Studio drew.</p>
      </div>
      <nav aria-label="Library sections" className="flex gap-1 border-b">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              tab === t.id ? "border-primary text-foreground" : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === "visuals" ? <VisualList visuals={visuals} /> : <DraftList drafts={drafts} />}
    </div>
  )
}
