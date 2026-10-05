"use client";

import { useActionState, useState, useTransition } from "react";
import type { Lead } from "@/db/schema";
import type { FormState } from "@/app/actions/auth";
import { deleteLeadAction, setLeadStatusAction } from "@/app/actions/leads";
import { CHANNEL_LABELS, SOURCE_LABELS, STATUS_LABELS } from "@/lib/leads";
import { Button, ButtonLink, Card, Field, FormError, Input, Select, Textarea } from "./ui";

export function LeadForm({
  action,
  lead,
  services,
  today,
  receivedOn,
}: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  lead?: Lead;
  services: string[];
  today: string;
  receivedOn?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const f = state.fields ?? {};
  const v = (k: string, fallback = "") => state.values?.[k] ?? fallback;
  const [status, setStatus] = useState(v("status", lead?.status ?? "new"));

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state.error} />
      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name *" name="name" error={f.name}>
            <Input id="name" name="name" defaultValue={v("name", lead?.name)} required autoComplete="off" />
          </Field>
          <Field label="Date received" name="receivedOn" error={f.receivedOn}>
            <Input id="receivedOn" name="receivedOn" type="date" max={today} defaultValue={v("receivedOn", receivedOn ?? today)} />
          </Field>
          <Field label="Phone" name="phone" error={f.phone}>
            <Input id="phone" name="phone" type="tel" defaultValue={v("phone", lead?.phone ?? "")} autoComplete="off" />
          </Field>
          <Field label="Email" name="email" error={f.email}>
            <Input id="email" name="email" type="email" defaultValue={v("email", lead?.email ?? "")} autoComplete="off" />
          </Field>
          <Field label="How did they contact you?" name="channel">
            <Select id="channel" name="channel" defaultValue={v("channel", lead?.channel ?? "call")}>
              {Object.entries(CHANNEL_LABELS).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </Select>
          </Field>
          <Field label="Where did they find the business?" name="source" hint="Ask them — it's what makes cost per lead accurate.">
            <Select id="source" name="source" defaultValue={v("source", lead?.source ?? "unknown")}>
              {Object.entries(SOURCE_LABELS).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </Select>
          </Field>
          <Field label="Service wanted" name="service" error={f.service}>
            <Input id="service" name="service" list="services" defaultValue={v("service", lead?.service ?? "")} />
            <datalist id="services">
              {services.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="Area" name="location" error={f.location}>
            <Input id="location" name="location" defaultValue={v("location", lead?.location ?? "")} placeholder="e.g. Sandton" />
          </Field>
          <Field label="Status" name="status">
            <Select id="status" name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </Select>
          </Field>
          {status === "won" && (
            <Field label="Job value (R)" name="value" error={f.value}>
              <Input id="value" name="value" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={v("value", lead?.value?.toString() ?? "")} />
            </Field>
          )}
        </div>
        <Field label="Notes" name="notes" error={f.notes}>
          <Textarea id="notes" name="notes" defaultValue={v("notes", lead?.notes ?? "")} />
        </Field>
      </Card>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : lead ? "Save lead" : "Add lead"}</Button>
        <ButtonLink href="/leads" variant="secondary">Cancel</ButtonLink>
      </div>
    </form>
  );
}

export function LeadStatusSelect({ clientId, leadId, status, disabled }: { clientId: string; leadId: string; status: string; disabled?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <span className="inline-flex items-center gap-2">
      <select
        aria-label="Lead status"
        className="rounded-lg border border-border bg-surface px-2 py-1 text-sm"
        defaultValue={status}
        disabled={disabled || pending}
        onChange={(e) => start(async () => setError((await setLeadStatusAction(clientId, leadId, e.target.value)).error))}
      >
        {Object.entries(STATUS_LABELS).map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
      </select>
      {error && <span className="text-xs text-bad">{error}</span>}
    </span>
  );
}

export function DeleteLeadButton({ clientId, leadId }: { clientId: string; leadId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this lead? This can't be undone.")) start(async () => void (await deleteLeadAction(clientId, leadId)));
      }}
    >
      Delete lead
    </Button>
  );
}
