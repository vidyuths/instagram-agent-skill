"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireSession } from "@/lib/auth"
import { addDraft, deleteDraft, setSetting } from "@/lib/db"
import { isStudioSkill } from "@/lib/skills"
import type { ActionResult } from "@/lib/tool-types"

async function guarded<T>(fn: () => T | Promise<T>): Promise<ActionResult<T>> {
  try {
    await requireSession()
    return { ok: true, data: await fn() }
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Invalid input." }
    console.error(e)
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }
  }
}

export async function saveVoice(text: string) {
  return guarded(() => {
    setSetting("voice", z.string().max(30_000, "Keep the voice profile under 30,000 characters.").parse(text))
    revalidatePath("/voice")
    revalidatePath("/")
  })
}

export async function saveDraft(skill: string, title: string, content: string) {
  return guarded(() => {
    const input = z
      .object({
        skill: z.string().refine(isStudioSkill, "Unknown skill"),
        title: z.string().trim().min(1).max(120),
        content: z.string().trim().min(1).max(60_000),
      })
      .parse({ skill, title, content })
    const id = addDraft(input.skill, input.title, input.content)
    revalidatePath("/library")
    return id
  })
}

export async function removeDraft(id: number) {
  return guarded(() => {
    deleteDraft(z.number().int().positive().parse(id))
    revalidatePath("/library")
  })
}
