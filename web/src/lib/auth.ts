import "server-only"
import { createHash, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"

import { SESSION_COOKIE, SESSION_DAYS, signSession, verifySession } from "@/lib/session"

// One owner, one password. Failed attempts are counted in memory, which is
// enough for a single container; a restart clears the count.
const MAX_FAILURES = 10
const WINDOW_MS = 15 * 60 * 1000
const failures: number[] = []

export function isLockedOut() {
  const cutoff = Date.now() - WINDOW_MS
  while (failures.length && failures[0] < cutoff) failures.shift()
  return failures.length >= MAX_FAILURES
}

export function checkPassword(attempt: string) {
  const expected = process.env.APP_PASSWORD
  if (!expected) throw new Error("APP_PASSWORD must be set")
  // Hash both sides so the comparison is constant-time regardless of length.
  const a = createHash("sha256").update(attempt).digest()
  const b = createHash("sha256").update(expected).digest()
  const ok = timingSafeEqual(a, b)
  if (!ok) failures.push(Date.now())
  return ok
}

export async function startSession() {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, await signSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
}

export async function endSession() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

export async function requireSession() {
  const jar = await cookies()
  if (!(await verifySession(jar.get(SESSION_COOKIE)?.value))) {
    throw new Error("Not signed in")
  }
}
