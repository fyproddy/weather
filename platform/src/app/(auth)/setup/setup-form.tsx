"use client";

import { useActionState } from "react";
import { setupAction, type FormState } from "@/app/actions/auth";
import { Button, Card, Field, FormError, Input } from "@/components/ui";

export function SetupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(setupAction, {});
  return (
    <Card className="p-6">
      <h1 className="text-lg font-semibold">Set up your agency</h1>
      <p className="mb-4 mt-1 text-sm text-muted">This creates your agency and your admin login. It only runs once.</p>
      <form action={action} className="space-y-4">
        <FormError message={state.error} />
        <Field label="Agency name" name="agencyName" error={state.fields?.agencyName}>
          <Input id="agencyName" name="agencyName" defaultValue="LeadPath Digital" required />
        </Field>
        <Field label="Your name" name="name" error={state.fields?.name}>
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
        <Field label="Email" name="email" error={state.fields?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" name="password" error={state.fields?.password} hint="At least 10 characters.">
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating…" : "Create agency"}
        </Button>
      </form>
    </Card>
  );
}
