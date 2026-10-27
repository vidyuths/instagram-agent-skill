import "server-only"

import { brandSchema, DEFAULT_BRAND, type Brand } from "@/lib/brand-shared"
import { getSetting, setSetting } from "@/lib/db"

export function getBrand(): Brand {
  const raw = getSetting("brand")
  if (!raw) return DEFAULT_BRAND
  try {
    const parsed = brandSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : DEFAULT_BRAND
  } catch {
    return DEFAULT_BRAND
  }
}

export function saveBrand(brand: Brand) {
  setSetting("brand", JSON.stringify(brandSchema.parse(brand)))
}

export function brandIsSaved() {
  return getSetting("brand") !== null
}

// Today in the user's time zone, as YYYY-MM-DD.
export function todayIn(timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}
