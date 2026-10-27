// Unauthenticated liveness check for Coolify.
export function GET() {
  return Response.json({ ok: true })
}
