"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BeatsPanel } from "./beats-panel"
import { CaptionPanel } from "./caption-panel"
import { HooksPanel } from "./hooks-panel"
import { HumanizePanel } from "./humanize-panel"

const TOOLS = [
  { id: "hooks", label: "Hooks", blurb: "Rank hook options on five checks before you shoot.", Panel: HooksPanel },
  { id: "beats", label: "Beat sheet", blurb: "Time a script line by line and catch the slow beats.", Panel: BeatsPanel },
  { id: "caption", label: "Caption", blurb: "See what the feed shows before “... more”, then lint the rest.", Panel: CaptionPanel },
  { id: "humanize", label: "Humanize", blurb: "Strip AI tells, invisible characters and stock phrases, then score it.", Panel: HumanizePanel },
] as const

export function Workbench() {
  return (
    <Tabs defaultValue="hooks" className="gap-6">
      <div className="-mx-4 overflow-x-auto px-4">
        <TabsList>
          {TOOLS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {TOOLS.map(({ id, blurb, Panel }) => (
        // forceMount keeps each tab's text when you switch away and back.
        <TabsContent key={id} value={id} forceMount className="grid gap-4 data-[state=inactive]:hidden">
          <p className="text-muted-foreground text-sm">{blurb}</p>
          <Panel />
        </TabsContent>
      ))}
    </Tabs>
  )
}
