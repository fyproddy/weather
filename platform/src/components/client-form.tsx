"use client";

import { useActionState } from "react";
import type { Client } from "@/db/schema";
import type { FormState } from "@/app/actions/auth";
import { Button, ButtonLink, Card, Field, FormError, Input, Textarea } from "./ui";

export function ClientForm({
  action,
  client,
  cancelHref,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  client?: Client;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const f = state.fields ?? {};
  const v = (k: keyof Client) => state.values?.[k] ?? (client?.[k] as string | null | undefined) ?? "";

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state.error} />
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Business</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name *" name="name" error={f.name}>
            <Input id="name" name="name" defaultValue={v("name")} required maxLength={200} />
          </Field>
          <Field label="Industry" name="industry" error={f.industry} hint="e.g. Waterproofing, Driving school">
            <Input id="industry" name="industry" defaultValue={v("industry")} />
          </Field>
          <Field label="Website" name="website" error={f.website}>
            <Input id="website" name="website" defaultValue={v("website")} placeholder="example.co.za" inputMode="url" />
          </Field>
          <Field label="Email" name="email" error={f.email}>
            <Input id="email" name="email" type="email" defaultValue={v("email")} />
          </Field>
          <Field label="Phone" name="phone" error={f.phone}>
            <Input id="phone" name="phone" type="tel" defaultValue={v("phone")} placeholder="078 000 0000" />
          </Field>
          <Field label="WhatsApp" name="whatsapp" error={f.whatsapp}>
            <Input id="whatsapp" name="whatsapp" type="tel" defaultValue={v("whatsapp")} placeholder="+27 78 000 0000" />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Location</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Street address" name="address" error={f.address}>
            <Input id="address" name="address" defaultValue={v("address")} />
          </Field>
          <Field label="City / town" name="city" error={f.city}>
            <Input id="city" name="city" defaultValue={v("city")} />
          </Field>
          <Field label="Province / region" name="region" error={f.region}>
            <Input id="region" name="region" defaultValue={v("region")} placeholder="Gauteng" />
          </Field>
          <Field label="Country" name="country" error={f.country}>
            <Input id="country" name="country" defaultValue={v("country") || "South Africa"} required />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <Field label="Internal notes" name="notes" error={f.notes} hint="Only your team sees these.">
          <Textarea id="notes" name="notes" defaultValue={v("notes")} />
        </Field>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : client ? "Save changes" : "Add client"}
        </Button>
        <ButtonLink href={cancelHref} variant="secondary">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
