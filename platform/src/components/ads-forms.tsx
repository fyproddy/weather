"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { deleteAdsImportAction, importAdsAction } from "@/app/actions/ads";
import { Button, Field, FormError, Input } from "./ui";

export function AdsImportForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(importAdsAction.bind(null, clientId), {});
  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      {state.ok && (
        <div role="status" className="space-y-2 rounded-lg border border-good/30 bg-good-soft px-4 py-3 text-sm">
          <p className="font-medium text-good">{state.message}</p>
          {!!state.warnings?.length && (
            <ul className="list-disc space-y-0.5 pl-5 text-text">
              {state.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <Link href="/ads" className="inline-block font-medium text-accent hover:underline">
            View Google Ads report →
          </Link>
        </div>
      )}
      <Field label="Google Ads report (.csv)" name="file" hint="Up to 5 MB.">
        <Input id="file" name="file" type="file" accept=".csv,.tsv,.txt,text/csv" required className="file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-1 file:text-sm" />
      </Field>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted">Report has no Day column and no date range? Enter its dates</summary>
        <div className="mt-3 grid max-w-md gap-3 sm:grid-cols-2">
          <Field label="From" name="periodFrom">
            <Input id="periodFrom" name="periodFrom" type="date" />
          </Field>
          <Field label="To" name="periodTo">
            <Input id="periodTo" name="periodTo" type="date" />
          </Field>
        </div>
      </details>
      <Button type="submit" disabled={pending}>
        {pending ? "Importing…" : "Import report"}
      </Button>
    </form>
  );
}

export function RemoveImportButton({ clientId, importId, filename }: { clientId: string; importId: string; filename: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-bad">{error}</span>}
      <button
        type="button"
        className="text-xs text-muted hover:text-bad disabled:opacity-50"
        disabled={pending}
        aria-label={`Remove import ${filename}`}
        onClick={() => {
          if (!confirm(`Remove ${filename}? Its data will be deleted. Data it replaced is not restored — re-import that file if you need it.`)) return;
          start(async () => setError((await deleteAdsImportAction(clientId, importId)).error));
        }}
      >
        Remove
      </button>
    </span>
  );
}
