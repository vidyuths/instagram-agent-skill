import Link from "next/link"

import { getSetting } from "@/lib/db"
import { STUDIO_SKILLS } from "@/lib/skills"
import { DEFAULT_MODEL, MODELS } from "@/lib/studio"
import { Studio } from "@/components/studio/studio"

export const dynamic = "force-dynamic"

export default function StudioPage() {
  const hasVoice = Boolean(getSetting("voice")?.trim())
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY)
  return (
    <div className="grid gap-4">
      {!hasKey && (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          ANTHROPIC_API_KEY is not set on the server, so the Studio cannot write yet. Add it in Coolify and redeploy.
        </p>
      )}
      {!hasVoice && (
        <p className="bg-warning/15 rounded-md px-3 py-2 text-sm">
          You have not saved a voice profile.{" "}
          <Link href="/voice" className="font-medium underline underline-offset-2">
            Set it up first
          </Link>{" "}
          or everything comes back generic.
        </p>
      )}
      <Studio
        skills={STUDIO_SKILLS.map((s) => ({ id: s.id, label: s.label, hint: s.hint }))}
        models={Object.entries(MODELS).map(([id, m]) => ({ id, label: m.label, note: m.note }))}
        defaultModel={DEFAULT_MODEL}
      />
    </div>
  )
}
