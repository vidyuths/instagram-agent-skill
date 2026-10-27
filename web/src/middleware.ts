import { NextResponse, type NextRequest } from "next/server"

import { SESSION_COOKIE, verifySession } from "@/lib/session"

export async function middleware(req: NextRequest) {
  const signedIn = await verifySession(req.cookies.get(SESSION_COOKIE)?.value)
  const onLogin = req.nextUrl.pathname === "/login"

  if (signedIn && onLogin) {
    return NextResponse.redirect(new URL("/", req.url))
  }
  if (!signedIn && !onLogin) {
    const url = new URL("/login", req.url)
    url.searchParams.set("next", req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|healthz).*)"],
}
