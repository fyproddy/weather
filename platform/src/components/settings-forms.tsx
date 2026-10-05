"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUserAction, updateAgencyAction } from "@/app/actions/settings";
import { Button, Field, FormError, Input, Select } from "./ui";

export function AgencyForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateAgencyAction, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="min-w-64 flex-1">
        <Field label="Agency name" name="agency-name" error={state.fields?.name}>
          <Input id="agency-name" name="name" defaultValue={name} required />
        </Field>
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        Save
      </Button>
      {state.error && <FormError message={state.error} />}
      {state.ok && <span className="text-sm text-good">{state.message}</span>}
    </form>
  );
}

export function AddUserForm() {
  const [state, action, pending] = useActionState(createUserAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const f = state.fields ?? {};
  return (
    <form ref={ref} action={action} className="space-y-4">
      <FormError message={state.error} />
      {state.ok && <p className="text-sm text-good">{state.message}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="user-name" error={f.name}>
          <Input id="user-name" name="name" required />
        </Field>
        <Field label="Email" name="user-email" error={f.email}>
          <Input id="user-email" name="email" type="email" required />
        </Field>
        <Field label="Temporary password" name="user-password" error={f.password} hint="At least 10 characters. Share it privately.">
          <Input id="user-password" name="password" type="password" autoComplete="new-password" minLength={10} required />
        </Field>
        <Field label="Role" name="user-role" hint="Viewers can see everything but change nothing.">
          <Select id="user-role" name="role" defaultValue="manager">
            <option value="manager">Manager — manage clients</option>
            <option value="viewer">Viewer — read only</option>
            <option value="admin">Admin — also users & settings</option>
          </Select>
        </Field>
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        Add user
      </Button>
    </form>
  );
}
