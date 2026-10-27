"use server"

import { redirect } from "next/navigation"

import { checkPassword, endSession, isLockedOut, startSession } from "@/lib/auth"

export type LoginState = { error?: string }

// Only same-origin paths, so a crafted ?next= cannot bounce you off-site.
function safeNext(next: FormDataEntryValue | null) {
  const value = typeof next === "string" ? next : ""
  return value.startsWith("/") && !value.startsWith("//") ? value : "/"
}

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (isLockedOut()) {
    return { error: "Too many attempts. Try again in 15 minutes." }
  }
  const password = form.get("password")
  if (typeof password !== "string" || !checkPassword(password)) {
    return { error: "Wrong password." }
  }
  await startSession()
  redirect(safeNext(form.get("next")))
}

export async function logout() {
  await endSession()
  redirect("/login")
}
