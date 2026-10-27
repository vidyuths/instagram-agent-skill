"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { saveBrandAction } from "@/app/(app)/data-actions"
import { SlideImage } from "@/components/slide-image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { brandSchema, DEFAULT_BRAND, TONE_LABELS, TONES, type Brand } from "@/lib/brand-shared"
import { AA, HEX, pickText } from "@/lib/contrast"
import { FORMATS, FORMAT_IDS, type FormatId } from "@/lib/slides"

const SAMPLE_LAYOUTS = ["cover", "statement", "list", "quote", "call to action"]

function ColourField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const valid = HEX.test(value)
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label={`${label} colour picker`}
        value={valid ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="border-input size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
      />
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value.trim())} aria-invalid={!valid} className="w-28 font-mono" maxLength={7} />
    </div>
  )
}

export function BrandForm({ initial, isSaved }: { initial: Brand; isSaved: boolean }) {
  const router = useRouter()
  const [brand, setBrand] = useState<Brand>(initial)
  const [pending, start] = useTransition()
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(
    isSaved ? null : { ok: false, msg: "Using the default palette. Save to keep it." },
  )
  const [stamp, setStamp] = useState(0)
  const [format, setFormat] = useState<FormatId>("post_portrait")

  const setColour = (tone: (typeof TONES)[number], v: string) => setBrand((b) => ({ ...b, colors: { ...b.colors, [tone]: v } }))
  const parsed = brandSchema.safeParse(brand)
  const zones = typeof Intl !== "undefined" && "supportedValuesOf" in Intl ? (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone") : []

  return (
    <div className="grid gap-6">
      <form
        className="grid gap-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (!parsed.success) return setStatus({ ok: false, msg: parsed.error.issues[0].message })
          start(async () => {
            const res = await saveBrandAction(parsed.data)
            if (res.ok) {
              setStatus({ ok: true, msg: "Saved." })
              setStamp(Date.now())
              router.refresh()
            } else setStatus({ ok: false, msg: res.error })
          })
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Slide colours</CardTitle>
            <CardDescription>Each row shows the text colour the renderer will use on it and the contrast. WCAG AA needs {AA}:1 for normal text.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {TONES.map((tone) => {
              const bg = brand.colors[tone]
              const ok = HEX.test(bg) && HEX.test(brand.ink) && HEX.test(brand.paper)
              const pick = ok ? pickText(bg, brand.ink, brand.paper) : null
              return (
                <div key={tone} className="grid items-center gap-3 sm:grid-cols-[7rem_auto_1fr]">
                  <Label htmlFor={`c-${tone}`}>{TONE_LABELS[tone]}</Label>
                  <ColourField id={`c-${tone}`} label={TONE_LABELS[tone]} value={bg} onChange={(v) => setColour(tone, v)} />
                  <div
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                    style={pick ? { background: bg, color: pick.color } : undefined}
                  >
                    <span className="font-medium">Calm mornings, clear intentions</span>
                    {pick && (
                      <span className="flex items-center gap-2">
                        <span className="tabular-nums">{pick.ratio.toFixed(1)}:1</span>
                        <Badge variant={pick.passes ? "success" : "destructive"}>{pick.passes ? "AA pass" : "AA fail"}</Badge>
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Text, handle and time zone</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ink">Dark text (ink)</Label>
              <ColourField id="ink" label="Ink" value={brand.ink} onChange={(v) => setBrand((b) => ({ ...b, ink: v }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="paper">Light text (paper)</Label>
              <ColourField id="paper" label="Paper" value={brand.paper} onChange={(v) => setBrand((b) => ({ ...b, paper: v }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="handle">Instagram handle</Label>
              <Input id="handle" value={brand.handle} placeholder="@yourhandle" onChange={(e) => setBrand((b) => ({ ...b, handle: e.target.value }))} />
              <p className="text-muted-foreground text-xs">Shown small in the corner of every slide, so screenshots carry your name.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tz">Time zone</Label>
              <Input id="tz" list="zones" value={brand.timezone} onChange={(e) => setBrand((b) => ({ ...b, timezone: e.target.value }))} />
              <datalist id="zones">
                {zones.map((z) => (
                  <option key={z} value={z} />
                ))}
              </datalist>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground w-fit text-xs underline underline-offset-2"
                onClick={() => setBrand((b) => ({ ...b, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }))}
              >
                Use this device&apos;s time zone
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save brand"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setBrand(DEFAULT_BRAND)}>
            Reset to the default palette
          </Button>
          {status && (
            <p role="status" className={status.ok ? "text-success text-sm" : "text-muted-foreground text-sm"}>
              {status.msg}
            </p>
          )}
        </div>
      </form>

      <section aria-labelledby="preview-h" className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="preview-h" className="text-lg font-semibold">
            Preview of the saved brand
          </h2>
          <div className="flex items-center gap-2">
            <Label htmlFor="pf" className="text-muted-foreground text-xs">
              Format
            </Label>
            <NativeSelect id="pf" value={format} onChange={(e) => setFormat(e.target.value as FormatId)} className="w-44">
              {FORMAT_IDS.map((f) => (
                <option key={f} value={f}>
                  {FORMATS[f].label}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <ul tabIndex={0} aria-label="Sample slides, scroll sideways" className="focus-visible:ring-ring/50 flex gap-3 overflow-x-auto rounded-md pb-2 outline-none focus-visible:ring-[3px]">
          {SAMPLE_LAYOUTS.map((name, i) => (
            <li key={name} className="w-56 shrink-0">
              <SlideImage src={`/api/brand/preview?slide=${i + 1}&format=${format}&v=${stamp}`} alt={`Sample ${name} slide in the saved brand colours`} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
