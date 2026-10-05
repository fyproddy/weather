"use client";

import { useActionState } from "react";
import { loginAction, type FormState } from "@/app/actions/auth";
import { Button, Card, Field, FormError, Input } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <Card className="p-6">
      <h1 className="mb-4 text-lg font-semibold">Sign in</h1>
      <form action={action} className="space-y-4">
        <FormError message={state.error} />
        <Field label="Email" name="email" error={state.fields?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} required />
        </Field>
        <Field label="Password" name="password" error={state.fields?.password}>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </Card>
  );
}
