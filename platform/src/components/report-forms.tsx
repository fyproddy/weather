"use client";

import { useActionState, useState, useTransition } from "react";
import type { FormState } from "@/app/actions/auth";
import { createReportAction, deleteReportAction, refreshReportAction, saveSummaryAction, setSharingAction } from "@/app/actions/reports";
import { Button, Field, FormError, Input, Select, Textarea } from "./ui";

export function CreateReportForm({ clientId, today }: { clientId: string; today: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createReportAction.bind(null, clientId), {});
  const [period, setPeriod] = useState(state.values?.period ?? "last_month");
  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <Field label="Period" name="period">
        <Select id="period" name="period" value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="last_month">Last month</option>
          <option value="last_30">Last 30 days</option>
          <option value="custom">Custom dates</option>
        </Select>
      </Field>
      {period === "custom" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="From" name="from">
            <Input id="from" name="from" type="date" max={today} defaultValue={state.values?.from} required />
          </Field>
          <Field label="To" name="to">
            <Input id="to" name="to" type="date" max={today} defaultValue={state.values?.to} required />
          </Field>
        </div>
      )}
      <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create report"}</Button>
    </form>
  );
}

export function SummaryForm({ reportId, summary }: { reportId: string; summary: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSummaryAction.bind(null, reportId), {});
  return (
    <form action={action} className="space-y-2">
      <FormError message={state.error} />
      <Field label="Your summary for the client" name="summary" hint="Shown at the top of the report. e.g. what happened this month, what you changed, what's next.">
        <Textarea id="summary" name="summary" defaultValue={summary ?? ""} maxLength={5000} className="min-h-32" />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Saving…" : "Save summary"}</Button>
        {state.ok && <span className="text-sm text-good">{state.message}</span>}
      </div>
    </form>
  );
}

export function ReportControls({ reportId, shareUrl }: { reportId: string; shareUrl: string | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const run = (fn: () => Promise<FormState>) => start(async () => setError((await fn()).error));
  return (
    <div className="space-y-3">
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => window.print()}>Save as PDF / print</Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => run(() => refreshReportAction(reportId))}>
          Refresh numbers
        </Button>
        {shareUrl ? (
          <Button type="button" variant="secondary" disabled={pending} onClick={() => run(() => setSharingAction(reportId, false))}>
            Turn off share link
          </Button>
        ) : (
          <Button type="button" disabled={pending} onClick={() => run(() => setSharingAction(reportId, true))}>
            Create share link
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (confirm("Delete this report? Its share link will stop working.")) start(async () => void (await deleteReportAction(reportId)));
          }}
        >
          Delete
        </Button>
      </div>
      {shareUrl && (
        <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
          <div className="mb-1 font-medium">Private link for the client (no login needed)</div>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all text-xs" aria-label="Share link">{shareUrl}</code>
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-1 text-xs"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </Button>
            <a className="text-xs text-accent hover:underline" href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer">
              Send on WhatsApp
            </a>
          </div>
          <p className="mt-1 text-xs text-muted">Anyone with this link can view the report. Turn it off at any time.</p>
        </div>
      )}
    </div>
  );
}
