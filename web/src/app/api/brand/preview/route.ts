import { cookies } from "next/headers"

import { getBrand } from "@/lib/brand"
import { renderSlide } from "@/lib/render"
import { SAMPLE_SPEC } from "@/lib/samples"
import { SESSION_COOKIE, verifySession } from "@/lib/session"
import { FORMAT_IDS, type FormatId } from "@/lib/slides"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Renders one sample slide with the saved brand: /api/brand/preview?slide=2&format=story
export async function GET(req: Request) {
  if (!(await verifySession((await cookies()).get(SESSION_COOKIE)?.value))) {
    return Response.json({ error: "Not signed in" }, { status: 401 })
  }
  const url = new URL(req.url)
  const slide = Number(url.searchParams.get("slide") ?? "1")
  const format = (url.searchParams.get("format") ?? "post_portrait") as FormatId
  if (!Number.isInteger(slide) || slide < 1 || slide > SAMPLE_SPEC.slides.length || !FORMAT_IDS.includes(format)) {
    return Response.json({ error: "Bad request" }, { status: 400 })
  }
  const png = await renderSlide({ ...SAMPLE_SPEC, format }, slide - 1, getBrand())
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" } })
}
