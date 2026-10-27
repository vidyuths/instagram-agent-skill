import { cookies } from "next/headers"
import { zipSync } from "fflate"

import { getBrand } from "@/lib/brand"
import { getVisual } from "@/lib/db"
import { renderSlide } from "@/lib/render"
import { SESSION_COOKIE, verifySession } from "@/lib/session"
import { slugify, specSchema } from "@/lib/slides"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Small in-memory cache so a page of thumbnails does not re-render on every view.
// The key includes the visual's updated_at and the brand, so edits show at once.
const cache = new Map<string, Buffer>()
function remember(key: string, value: Buffer) {
  cache.set(key, value)
  if (cache.size > 120) cache.delete(cache.keys().next().value as string)
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string; slide: string }> }) {
  if (!(await verifySession((await cookies()).get(SESSION_COOKIE)?.value))) {
    return Response.json({ error: "Not signed in" }, { status: 401 })
  }
  const { id, slide } = await ctx.params
  const row = Number.isInteger(Number(id)) ? getVisual(Number(id)) : null
  if (!row) return Response.json({ error: "Not found" }, { status: 404 })
  const parsed = specSchema.safeParse(JSON.parse(row.spec))
  if (!parsed.success) return Response.json({ error: "Saved slides are invalid" }, { status: 500 })
  const spec = parsed.data
  const brand = getBrand()
  const stamp = `${row.id}:${row.updated_at}:${JSON.stringify(brand)}`
  const name = slugify(spec.title)

  const png = async (i: number) => {
    const key = `${stamp}:${i}`
    const hit = cache.get(key)
    if (hit) return hit
    const buf = await renderSlide(spec, i, brand)
    remember(key, buf)
    return buf
  }

  if (slide === "zip") {
    const files: Record<string, Uint8Array> = {}
    for (let i = 0; i < spec.slides.length; i++) {
      files[`${name}-${String(i + 1).padStart(2, "0")}.png`] = new Uint8Array(await png(i))
    }
    const notes = [spec.alt ? `ALT TEXT (cover)\n${spec.alt}` : "", spec.caption ? `CAPTION\n${spec.caption}` : ""].filter(Boolean).join("\n\n")
    if (notes) files[`${name}-notes.txt`] = new TextEncoder().encode(notes + "\n")
    // PNGs are already compressed, so store rather than deflate.
    const zip = zipSync(files, { level: 0 })
    return new Response(new Uint8Array(zip), {
      headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${name}.zip"`, "Cache-Control": "private, no-store" },
    })
  }

  const n = Number(slide)
  if (!Number.isInteger(n) || n < 1 || n > spec.slides.length) return Response.json({ error: "No such slide" }, { status: 404 })
  const download = new URL(req.url).searchParams.has("download")
  return new Response(new Uint8Array(await png(n - 1)), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}-${String(n).padStart(2, "0")}.png"`,
      "Cache-Control": "private, max-age=300",
    },
  })
}
