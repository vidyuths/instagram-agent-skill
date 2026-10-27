import { AppNav } from "@/components/app-nav"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6">
      <AppNav />
      <main id="main" className="grid gap-4">
        {children}
      </main>
    </div>
  )
}
