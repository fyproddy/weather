"use client";

import { useActionState, useRef, useTransition, useEffect, useState } from "react";
import type { FormState } from "@/app/actions/auth";
import {
  addCompetitorAction,
  addFactAction,
  addLocationAction,
  addServiceAction,
  deleteClientAction,
  removeChildAction,
  setArchivedAction,
  setFactVerifiedAction,
} from "@/app/actions/clients";
import type { ChildKind } from "@/server/clients";
import { FACT_CATEGORIES } from "@/lib/facts";
import { Button, Field, FormError, Input, Select } from "./ui";

/** Small inline "add" form that clears itself after a successful save. */
function useAddForm(action: (s: FormState, fd: FormData) => Promise<FormState>) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return { state, formAction, pending, ref };
}

export function AddServiceForm({ clientId }: { clientId: string }) {
  const { state, formAction, pending, ref } = useAddForm(addServiceAction.bind(null, clientId));
  return (
    <form ref={ref} action={formAction} className="space-y-2">
      <FormError message={state.error} />
      <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr_auto]">
        <Input name="name" aria-label="Service name" placeholder="Service name" defaultValue={state.values?.name} required />
        <Input name="description" aria-label="Service description" placeholder="Short description (optional)" defaultValue={state.values?.description} />
        <Button type="submit" variant="secondary" disabled={pending}>
          Add
        </Button>
      </div>
      {state.fields?.name && <p className="text-xs text-bad">{state.fields.name}</p>}
    </form>
  );
}

export function AddLocationForm({ clientId }: { clientId: string }) {
  const { state, formAction, pending, ref } = useAddForm(addLocationAction.bind(null, clientId));
  return (
    <form ref={ref} action={formAction} className="space-y-2">
      <FormError message={state.error} />
      <div className="grid gap-2 sm:grid-cols-[1fr_9rem_auto]">
        <Input name="name" aria-label="Target location" placeholder="Area, e.g. Sandton" defaultValue={state.values?.name} required />
        <Input name="radiusKm" aria-label="Radius in km" type="number" min={1} max={500} placeholder="Radius km" defaultValue={state.values?.radiusKm} />
        <Button type="submit" variant="secondary" disabled={pending}>
          Add
        </Button>
      </div>
      {(state.fields?.name || state.fields?.radiusKm) && (
        <p className="text-xs text-bad">{state.fields?.name ?? "Radius must be between 1 and 500 km"}</p>
      )}
    </form>
  );
}

export function AddCompetitorForm({ clientId }: { clientId: string }) {
  const { state, formAction, pending, ref } = useAddForm(addCompetitorAction.bind(null, clientId));
  return (
    <form ref={ref} action={formAction} className="space-y-2">
      <FormError message={state.error} />
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input name="name" aria-label="Competitor name" placeholder="Competitor name" defaultValue={state.values?.name} required />
        <Input name="website" aria-label="Competitor website" placeholder="Website (optional)" defaultValue={state.values?.website} />
        <Button type="submit" variant="secondary" disabled={pending}>
          Add
        </Button>
      </div>
      {(state.fields?.name || state.fields?.website) && (
        <p className="text-xs text-bad">{state.fields?.name ?? state.fields?.website}</p>
      )}
    </form>
  );
}


export function AddFactForm({ clientId }: { clientId: string }) {
  const { state, formAction, pending, ref } = useAddForm(addFactAction.bind(null, clientId));
  return (
    <form ref={ref} action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <Field label="Type" name="fact-category">
          <Select id="fact-category" name="category" defaultValue={state.values?.category ?? "guarantee"}>
            {FACT_CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fact" name="fact-statement" error={state.fields?.statement}>
          <Input id="fact-statement" name="statement" placeholder="e.g. Free on-site inspection and quote" defaultValue={state.values?.statement} required />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Where does this come from?" name="fact-source" hint="e.g. Confirmed by owner on call, 5 Oct">
          <Input id="fact-source" name="source" defaultValue={state.values?.source} />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>
          Add fact
        </Button>
      </div>
    </form>
  );
}

function useInlineAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const run = (fn: () => Promise<FormState>) =>
    start(async () => {
      const r = await fn();
      setError(r.error);
    });
  return { pending, error, run };
}

export function RemoveButton({ clientId, kind, id, label }: { clientId: string; kind: ChildKind; id: string; label: string }) {
  const { pending, error, run } = useInlineAction();
  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-bad">{error}</span>}
      <button
        type="button"
        className="text-xs text-muted hover:text-bad disabled:opacity-50"
        disabled={pending}
        aria-label={`Remove ${label}`}
        onClick={() => run(() => removeChildAction(clientId, kind, id))}
      >
        Remove
      </button>
    </span>
  );
}

export function VerifyToggle({ clientId, factId, verified }: { clientId: string; factId: string; verified: boolean }) {
  const { pending, error, run } = useInlineAction();
  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-bad">{error}</span>}
      <Button
        type="button"
        variant={verified ? "ghost" : "secondary"}
        className="px-2.5 py-1 text-xs"
        disabled={pending}
        onClick={() => run(() => setFactVerifiedAction(clientId, factId, !verified))}
      >
        {verified ? "Unverify" : "Mark verified"}
      </Button>
    </span>
  );
}

export function ArchiveButton({ clientId, archived }: { clientId: string; archived: boolean }) {
  const { pending, error, run } = useInlineAction();
  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-bad">{error}</span>}
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          if (!archived && !confirm("Archive this client? You can restore it later.")) return;
          run(() => setArchivedAction(clientId, !archived));
        }}
      >
        {archived ? "Restore client" : "Archive"}
      </Button>
    </span>
  );
}

export function DeleteClientForm({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [state, action, pending] = useActionState(deleteClientAction.bind(null, clientId), {});
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-muted">
        Permanently deletes <strong className="text-text">{clientName}</strong> and all its data. This can&apos;t be undone.
      </p>
      <FormError message={state.error} />
      <div className="flex flex-wrap gap-2">
        <Input name="confirm" aria-label="Type DELETE to confirm" placeholder="Type DELETE" className="max-w-48" autoComplete="off" />
        <Button type="submit" variant="danger" disabled={pending}>
          Delete permanently
        </Button>
      </div>
    </form>
  );
}
