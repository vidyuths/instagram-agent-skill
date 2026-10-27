import { Workbench } from "@/components/tools/workbench"

export default function ToolsPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-semibold">Tools</h1>
        <p className="text-muted-foreground text-sm">Instant checks that run on the server. No AI, no cost.</p>
      </div>
      <Workbench />
    </div>
  )
}
