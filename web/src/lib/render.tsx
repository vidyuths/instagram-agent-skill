import "server-only"
import fs from "node:fs"
import path from "node:path"
import satori from "satori"
import sharp from "sharp"

import { TONE_LABELS, type Brand } from "@/lib/brand-shared"
import { pickText } from "@/lib/contrast"
import { FORMATS, toneFor, type Slide, type SlideSpec } from "@/lib/slides"

// Draws slides as PNGs: satori turns the layout into SVG (text becomes paths, so
// no system fonts are needed) and sharp rasterises it. Sizes follow the carousel
// and story skills: 120px side margins, nothing in a story above y=250 or below
// y=1600, and no type smaller than 40px.

const FONTS_DIR = process.env.FONTS_DIR ?? path.resolve(process.cwd(), "assets", "fonts")
const MARGIN = 120
const FOOTER_H = 56
const MIN_BODY = 40

type FontDef = { name: string; data: Buffer; weight: 400 | 500 | 600 | 700; style: "normal" }
let fonts: FontDef[] | undefined
function loadFonts(): FontDef[] {
  if (fonts) return fonts
  const f = (file: string) => fs.readFileSync(path.join(FONTS_DIR, file))
  fonts = [
    { name: "Fraunces", data: f("Fraunces-600.woff"), weight: 600, style: "normal" },
    { name: "Fraunces", data: f("Fraunces-700.woff"), weight: 700, style: "normal" },
    { name: "DM Sans", data: f("DMSans-400.woff"), weight: 400, style: "normal" },
    { name: "DM Sans", data: f("DMSans-500.woff"), weight: 500, style: "normal" },
    { name: "DM Sans", data: f("DMSans-700.woff"), weight: 700, style: "normal" },
  ]
  return fonts
}

// ---- text fitting -----------------------------------------------------------

function lineCount(text: string, size: number, width: number, charW: number) {
  const perLine = Math.max(1, Math.floor(width / (size * charW)))
  let lines = 0
  for (const para of text.split("\n")) {
    let cur = 0
    let n = 1
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if (cur === 0) cur = word.length
      else if (cur + 1 + word.length <= perLine) cur += 1 + word.length
      else {
        n++
        cur = word.length
      }
      while (cur > perLine) {
        n++
        cur -= perLine
      }
    }
    lines += n
  }
  return lines
}

type Fit = { size: number; height: number; overflow: boolean }
function fit(text: string, o: { max: number; min: number; width: number; maxH: number; lh: number; charW: number }): Fit {
  for (let size = o.max; size >= o.min; size -= 4) {
    const height = lineCount(text, size, o.width, o.charW) * size * o.lh
    if (height <= o.maxH) return { size, height, overflow: false }
  }
  return { size: o.min, height: lineCount(text, o.min, o.width, o.charW) * o.min * o.lh, overflow: true }
}

const HEAD_CHAR = 0.56 // Fraunces is wide
const BODY_CHAR = 0.5

// ---- layout ------------------------------------------------------------------

type Built = { element: React.ReactElement; warnings: string[] }

function geometry(format: SlideSpec["format"]) {
  const { w, h } = FORMATS[format]
  const top = format === "story" ? 250 : MARGIN
  const bottom = format === "story" ? h - 1600 : MARGIN
  const contentW = w - MARGIN * 2
  const contentH = h - top - bottom - FOOTER_H - 60
  return { w, h, top, bottom, contentW, contentH }
}

function build(spec: SlideSpec, index: number, brand: Brand): Built {
  const slide: Slide = spec.slides[index]
  const g = geometry(spec.format)
  const tone = toneFor(slide, index)
  const bg = brand.colors[tone]
  const pick = pickText(bg, brand.ink, brand.paper)
  const color = pick.color
  const label = `Slide ${index + 1}`
  const warnings: string[] = []
  if (!pick.passes) warnings.push(`${label}: ${TONE_LABELS[tone]} background gives only ${pick.ratio.toFixed(1)}:1 text contrast (AA needs 4.5:1).`)

  const check = (what: string, f: Fit) => {
    if (f.overflow) warnings.push(`${label}: the ${what} is too long for this layout. Shorten it or split the slide.`)
    return f
  }

  const eyebrow = slide.eyebrow ? (
    <div style={{ display: "flex", fontSize: 36, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", marginBottom: 36 }}>
      {slide.eyebrow}
    </div>
  ) : null
  const rule = <div style={{ display: "flex", width: 96, height: 8, background: color, marginTop: 44, marginBottom: 44 }} />
  const head = (size: number): React.CSSProperties => ({
    display: "flex",
    fontFamily: "Fraunces",
    fontWeight: 700,
    fontSize: size,
    lineHeight: 1.08,
  })
  const para = (size: number): React.CSSProperties => ({ display: "flex", fontSize: size, lineHeight: 1.35 })

  let inner: React.ReactElement
  switch (slide.layout) {
    case "cover": {
      const words = slide.title.split(/\s+/).length
      if (words > 6) warnings.push(`${label}: the cover title is ${words} words. Six or fewer reads in the grid thumbnail.`)
      const t = check("title", fit(slide.title, { max: 176, min: 88, width: g.contentW, maxH: g.contentH * 0.58, lh: 1.08, charW: HEAD_CHAR }))
      const b = slide.body ? check("subtitle", fit(slide.body, { max: 56, min: MIN_BODY, width: g.contentW, maxH: g.contentH * 0.22, lh: 1.35, charW: BODY_CHAR })) : null
      inner = (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {eyebrow}
          <div style={head(t.size)}>{slide.title}</div>
          {slide.body ? rule : null}
          {slide.body && b ? <div style={para(b.size)}>{slide.body}</div> : null}
        </div>
      )
      break
    }
    case "statement": {
      const t = check("title", fit(slide.title, { max: 108, min: 64, width: g.contentW, maxH: g.contentH * 0.42, lh: 1.08, charW: HEAD_CHAR }))
      const b = slide.body ? check("text", fit(slide.body, { max: 54, min: MIN_BODY, width: g.contentW, maxH: g.contentH * 0.42, lh: 1.35, charW: BODY_CHAR })) : null
      inner = (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {eyebrow}
          <div style={head(t.size)}>{slide.title}</div>
          {slide.body ? rule : null}
          {slide.body && b ? <div style={para(b.size)}>{slide.body}</div> : null}
        </div>
      )
      break
    }
    case "list": {
      const items = slide.items ?? []
      if (!items.length) warnings.push(`${label}: a list slide needs items.`)
      const t = check("title", fit(slide.title, { max: 88, min: 56, width: g.contentW, maxH: g.contentH * 0.22, lh: 1.08, charW: HEAD_CHAR }))
      const gap = 36
      const longest = items.reduce((a, b) => (b.length > a.length ? b : a), "")
      const itemW0 = g.contentW - 90 - 32
      const per = items.length ? (g.contentH * 0.7 - gap * items.length) / items.length : 0
      const it = check("items", fit(longest || " ", { max: 54, min: MIN_BODY, width: itemW0, maxH: per, lh: 1.3, charW: BODY_CHAR }))
      const num = Math.round(it.size * 1.5)
      inner = (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {eyebrow}
          <div style={head(t.size)}>{slide.title}</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 48 }}>
            {items.map((text, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", marginBottom: gap }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: num,
                    height: num,
                    borderRadius: num / 2,
                    border: `4px solid ${color}`,
                    fontWeight: 700,
                    fontSize: Math.round(it.size * 0.85),
                    marginRight: 32,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ display: "flex", flex: 1, fontSize: it.size, lineHeight: 1.3, paddingTop: Math.round((num - it.size * 1.3) / 2) }}>{text}</div>
              </div>
            ))}
          </div>
        </div>
      )
      break
    }
    case "quote": {
      const t = check("quote", fit(slide.title, { max: 92, min: 56, width: g.contentW, maxH: g.contentH * 0.55, lh: 1.15, charW: HEAD_CHAR }))
      const b = slide.body ? check("attribution", fit(slide.body, { max: 44, min: MIN_BODY, width: g.contentW, maxH: g.contentH * 0.15, lh: 1.3, charW: BODY_CHAR })) : null
      inner = (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {eyebrow}
          <div style={{ display: "flex", fontFamily: "Fraunces", fontWeight: 700, fontSize: 200, lineHeight: 1, height: 110, marginBottom: 24 }}>{"“"}</div>
          <div style={{ ...head(t.size), fontWeight: 600, lineHeight: 1.15 }}>{slide.title}</div>
          {slide.body && b ? <div style={{ ...para(b.size), marginTop: 44, fontWeight: 500 }}>{slide.body}</div> : null}
        </div>
      )
      break
    }
    case "cta": {
      const t = check("title", fit(slide.title, { max: 120, min: 64, width: g.contentW, maxH: g.contentH * 0.4, lh: 1.08, charW: HEAD_CHAR }))
      const b = slide.body ? check("text", fit(slide.body, { max: 52, min: MIN_BODY, width: g.contentW, maxH: g.contentH * 0.25, lh: 1.35, charW: BODY_CHAR })) : null
      const a = slide.action
        ? check("button text", fit(slide.action, { max: 52, min: MIN_BODY, width: g.contentW - 112, maxH: 52 * 2.2, lh: 1.2, charW: BODY_CHAR }))
        : null
      inner = (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {eyebrow}
          <div style={head(t.size)}>{slide.title}</div>
          {slide.body && b ? <div style={{ ...para(b.size), marginTop: 36 }}>{slide.body}</div> : null}
          {slide.action && a ? (
            <div style={{ display: "flex", marginTop: 56 }}>
              <div
                style={{
                  display: "flex",
                  background: color,
                  color: bg,
                  borderRadius: 999,
                  paddingTop: 26,
                  paddingBottom: 26,
                  paddingLeft: 56,
                  paddingRight: 56,
                  fontSize: a.size,
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                {slide.action}
              </div>
            </div>
          ) : null}
        </div>
      )
      break
    }
  }

  // Explicit sizes and margins, no padding: yoga adds padding on top of width, which pushed
  // the footer off the canvas and let text run past the right margin.
  const areaH = g.h - g.top - g.bottom
  const element = (
    <div style={{ display: "flex", width: g.w, height: g.h, background: bg, color, fontFamily: "DM Sans" }}>
      <div style={{ display: "flex", flexDirection: "column", marginLeft: MARGIN, marginTop: g.top, width: g.contentW, height: areaH }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: g.contentW, height: areaH - FOOTER_H }}>
          {inner}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: g.contentW, height: FOOTER_H, fontSize: 34, fontWeight: 500 }}>
          <div style={{ display: "flex" }}>{brand.handle ? (brand.handle.startsWith("@") ? brand.handle : `@${brand.handle}`) : ""}</div>
          <div style={{ display: "flex" }}>{`${index + 1}/${spec.slides.length}`}</div>
        </div>
      </div>
    </div>
  )
  return { element, warnings }
}

// ---- public API ---------------------------------------------------------------

export function analyzeSpec(spec: SlideSpec, brand: Brand): string[] {
  const warnings = spec.slides.flatMap((_, i) => build(spec, i, brand).warnings)
  if (!spec.alt) warnings.push("No alt text for the cover. Instagram and screen readers use it.")
  return [...new Set(warnings)]
}

export async function renderSlide(spec: SlideSpec, index: number, brand: Brand): Promise<Buffer> {
  const { w, h } = FORMATS[spec.format]
  const { element } = build(spec, index, brand)
  const svg = await satori(element, { width: w, height: h, fonts: loadFonts() })
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
}
