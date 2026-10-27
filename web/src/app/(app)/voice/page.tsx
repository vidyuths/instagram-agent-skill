import { getSetting } from "@/lib/db"
import { voiceTemplate } from "@/lib/skills"
import { VoiceForm } from "./voice-form"

export const dynamic = "force-dynamic"

export default function VoicePage() {
  const saved = getSetting("voice")
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold">Your voice</h1>
        <p className="text-muted-foreground text-sm">
          Every Studio skill reads this. Fill in who you are, how you sound and what you will never say. Or paste three of your own reels or captions
          under the headings and ask Studio to tighten it.
        </p>
      </div>
      <VoiceForm initial={saved ?? voiceTemplate()} isSaved={saved !== null} />
    </div>
  )
}
