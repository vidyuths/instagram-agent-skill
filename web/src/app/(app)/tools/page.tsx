import { Workbench } from "@/components/tools/workbench"

export default function ToolsPage() {
  return (
    <div className="grid gap-6">
      <p className="text-muted-foreground text-sm">Instant checks that run on the server. No AI, no cost.</p>
      <Workbench />
    </div>
  )
}
