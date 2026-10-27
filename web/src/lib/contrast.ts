// WCAG 2.x contrast helpers. Pure, so the Brand form and the renderer agree.

export const HEX = /^#[0-9a-fA-F]{6}$/
export const AA = 4.5 // normal text
export const AA_LARGE = 3 // 24px+ text, or 18.66px+ bold

export function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}

export function luminance(hex: string) {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export type TextPick = { color: string; ratio: number; passes: boolean }

// Whichever of the two text colours reads better on this background.
export function pickText(bg: string, ink: string, paper: string): TextPick {
  const ri = contrastRatio(ink, bg)
  const rp = contrastRatio(paper, bg)
  const [color, ratio] = ri >= rp ? [ink, ri] : [paper, rp]
  return { color, ratio, passes: ratio >= AA }
}
