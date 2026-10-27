"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login, type LoginState } from "./actions"

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {})

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>IG Studio</CardTitle>
        <CardDescription>Sign in to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4">
          <input type="hidden" name="next" value={next} />
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
          </div>
          {state.error && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
