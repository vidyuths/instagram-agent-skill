import { notFound } from "next/navigation"

import { getBrand } from "@/lib/brand"
import { getVisual } from "@/lib/db"
import { analyzeSpec } from "@/lib/render"
import { specSchema } from "@/lib/slides"
import { VisualEditor } from "./visual-editor"

export const dynamic = "force-dynamic"

export default async function VisualPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = Number.isInteger(Number(id)) ? getVisual(Number(id)) : null
  if (!row) notFound()
  const parsed = specSchema.safeParse(JSON.parse(row.spec))
  if (!parsed.success) notFound()
  const warnings = analyzeSpec(parsed.data, getBrand())
  return <VisualEditor id={row.id} spec={parsed.data} updatedAt={row.updated_at} warnings={warnings} />
}
