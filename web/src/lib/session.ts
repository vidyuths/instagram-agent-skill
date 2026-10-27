import { SignJWT, jwtVerify } from "jose"

// Shared by middleware (edge runtime) and server actions, so no Node-only imports here.

export const SESSION_COOKIE = "ig_session"
export const SESSION_DAYS = 30

function secretKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters")
  }
  return new TextEncoder().encode(secret)
}

export async function signSession() {
  return new SignJWT({ sub: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey())
}

export async function verifySession(token: string | undefined) {
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] })
    return payload.sub === "owner"
  } catch {
    return false
  }
}
