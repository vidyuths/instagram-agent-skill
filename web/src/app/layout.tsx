import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "IG Studio",
  description: "Hooks, beat sheets, captions and a humanizer for Instagram.",
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
