import { LogOut } from "lucide-react"

import { Workbench } from "@/components/tools/workbench"
import { Button } from "@/components/ui/button"
import { logout } from "./login/actions"

export default function Home() {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">IG Studio</h1>
          <p className="text-muted-foreground text-sm">Instant tools. Nothing here posts to Instagram.</p>
        </div>
        <form action={logout}>
          <Button variant="ghost" size="sm" type="submit">
            <LogOut />
            Sign out
          </Button>
        </form>
      </header>
      <Workbench />
    </div>
  )
}
