import { cookies } from "next/headers"
import { z } from "zod"

import { SESSION_COOKIE, verifySession } from "@/lib/session"
import { isStudioSkill } from "@/lib/skills"
import { DEFAULT_MODEL, MODELS, runStudio, type ModelId } from "@/lib/studio"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const Body = z.object({
  skill: z.string().refine(isStudioSkill, "Unknown skill"),
  model: z.string().refine((m): m is ModelId => m in MODELS).default(DEFAULT_MODEL),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(30_000) }))
    .min(1)
    .max(40)
    .refine((m) => m[0].role === "user" && m[m.length - 1].role === "user", "Conversation must start and end with the user")
    .refine((m) => m.reduce((n, x) => n + x.content.length, 0) <= 120_000, "Conversation is too long"),
})

export async function POST(req: Request) {
  // The middleware already gates this route; check again so it never depends on the matcher.
  if (!(await verifySession((await cookies()).get(SESSION_COOKIE)?.value))) {
    return Response.json({ error: "Not signed in" }, { status: 401 })
  }
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 })
  }
  const { skill, model, messages } = parsed.data

  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
      try {
        for await (const event of runStudio({ skill: skill as never, model: model as ModelId, messages, signal: req.signal })) send(event)
      } catch (e) {
        if (!req.signal.aborted) {
          console.error(e)
          send({ t: "error", message: "Something went wrong on the server." })
        }
      } finally {
        controller.close()
      }
    },
  })
  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  })
}
