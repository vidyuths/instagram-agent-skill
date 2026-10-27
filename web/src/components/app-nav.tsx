"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"

import { logout } from "@/app/login/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/", label: "Studio" },
  { href: "/calendar", label: "Calendar" },
  { href: "/library", label: "Library" },
  { href: "/tools", label: "Tools" },
  { href: "/brand", label: "Brand" },
  { href: "/voice", label: "Voice" },
]

export function AppNav() {
  const pathname = usePathname()
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <span className="text-lg font-semibold whitespace-nowrap">IG Studio</span>
      <div className="order-last w-full overflow-x-auto sm:order-none sm:w-auto sm:flex-1 sm:overflow-visible sm:pl-2">
        <nav aria-label="Main" className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href) || (l.href === "/library" && pathname.startsWith("/visuals"))
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-visible:ring-ring/50 rounded-md px-3 py-1.5 text-sm font-medium outline-none focus-visible:ring-[3px]",
                  active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <form action={logout}>
        <Button variant="ghost" size="sm" type="submit">
          <LogOut />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </form>
    </header>
  )
}
