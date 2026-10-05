"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction, type FormState } from "@/app/actions/auth";
import { Button, Card, Field, FormError, Input } from "@/components/ui";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPasswordAction, {});
  if (state.ok) {
    return (
      <Card className="space-y-4 p-6">
        <p role="status" className="text-sm text-good">{state.message}</p>
        <Link href="/login" className="block w-full rounded-lg bg-accent px-3.5 py-2 text-center text-sm font-medium text-accent-fg">
          Go to sign in
        </Link>
      </Card>
    );
  }
  const f = state.fields ?? {};
  return (
    <Card className="p-6">
      <h1 className="text-lg font-semibold">Reset admin password</h1>
      <p className="mb-4 mt-1 text-sm text-muted">
        For the agency admin. You&apos;ll need the SETUP_CODE from your hosting settings. Other team members: ask your admin.
      </p>
      <form action={action} className="space-y-4">
        <FormError message={state.error} />
        <Field label="Email" name="email" error={f.email}>
          <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} required />
        </Field>
        <Field label="Setup code" name="setupCode" error={f.setupCode}>
          <Input id="setupCode" name="setupCode" type="password" autoComplete="off" required />
        </Field>
        <Field label="New password" name="newPassword" error={f.newPassword} hint="At least 10 characters.">
          <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={10} required />
        </Field>
        <Field label="Confirm new password" name="confirm" error={f.confirm}>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving…" : "Set new password"}
        </Button>
        <p className="text-center text-sm">
          <Link href="/login" className="text-muted hover:text-text">Back to sign in</Link>
        </p>
      </form>
    </Card>
  );
}
