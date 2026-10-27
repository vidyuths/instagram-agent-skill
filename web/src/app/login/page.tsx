import { LoginForm } from "./login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <LoginForm next={next ?? "/"} />
    </main>
  )
}
