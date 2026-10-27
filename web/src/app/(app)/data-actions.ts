"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireSession } from "@/lib/auth"
import { saveBrand } from "@/lib/brand"
import { brandSchema, type Brand } from "@/lib/brand-shared"
import { addDraft, addPost, deleteDraft, deletePost, deleteVisual, getVisual, updatePost, updateVisual } from "@/lib/db"
import { setSetting } from "@/lib/db"
import { postSchema, type PostFields } from "@/lib/posts-shared"
import { isStudioSkill } from "@/lib/skills"
import { specSchema, type SlideSpec } from "@/lib/slides"
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

export async function saveBrandAction(brand: Brand) {
  return guarded(() => {
    saveBrand(brandSchema.parse(brand))
    revalidatePath("/brand")
    revalidatePath("/calendar")
  })
}

export async function saveVisualAction(id: number, spec: SlideSpec) {
  return guarded(() => {
    const parsed = specSchema.parse(spec)
    if (!getVisual(id)) throw new Error("That slide set no longer exists.")
    updateVisual(id, parsed.title, parsed.format, JSON.stringify(parsed))
    revalidatePath(`/visuals/${id}`)
    revalidatePath("/library")
  })
}

export async function removeVisual(id: number) {
  return guarded(() => {
    deleteVisual(z.number().int().positive().parse(id))
    revalidatePath("/library")
    revalidatePath("/calendar")
  })
}

export async function savePost(id: number | null, fields: PostFields) {
  return guarded(() => {
    const post = postSchema.parse(fields)
    if (post.visual_id && !getVisual(post.visual_id)) throw new Error("That slide set no longer exists.")
    const saved = id ? (updatePost(z.number().int().positive().parse(id), post), id) : addPost(post)
    revalidatePath("/calendar")
    return saved
  })
}

export async function removePost(id: number) {
  return guarded(() => {
    deletePost(z.number().int().positive().parse(id))
    revalidatePath("/calendar")
  })
}
