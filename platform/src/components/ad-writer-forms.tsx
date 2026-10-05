"use client";

import { useActionState, useState, useTransition } from "react";
import type { AdDraftItem } from "@/db/schema";
import type { FormState } from "@/app/actions/auth";
import { deleteAdDraftAction, editAdItemAction, generateAdsAction, setAdItemStatusAction } from "@/app/actions/ad-writer";
import { LIMITS } from "@/lib/ad-copy";
import { Badge, Button, Field, FormError, Select, Textarea, cx } from "./ui";

export function GenerateAdsForm({ clientId, services }: { clientId: string; services: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(generateAdsAction.bind(null, clientId), {});
  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <Field label="What is this ad about?" name="focus" error={state.fields?.focus}>
        <Select id="focus" name="focus" defaultValue={state.values?.focus ?? services[0] ?? ""} required>
          {services.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
          <option value="The business as a whole">The business as a whole</option>
        </Select>
      </Field>
      <Field label="Anything else? (optional)" name="instructions" hint="e.g. focus on Sandton homeowners, mention the rainy season, friendly tone">
        <Textarea id="instructions" name="instructions" defaultValue={state.values?.instructions ?? ""} maxLength={1000} className="min-h-16" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Writing… this takes about 30–60 seconds" : "Write ads"}
      </Button>
    </form>
  );
}

const KIND_LABEL = { headline: "Headline", description: "Description", callout: "Callout" } as const;

export function AdLine({
  clientId,
  draftId,
  item,
  canEdit,
  factText,
}: {
  clientId: string;
  draftId: string;
  item: AdDraftItem;
  canEdit: boolean;
  factText: Record<string, string>;
}) {
  const [text, setText] = useState(item.text);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const limit = LIMITS[item.kind];
  const dirty = text.trim() !== item.text;
  const run = (fn: () => Promise<FormState>) => start(async () => setError((await fn()).error));

  return (
    <li
      aria-label={`${KIND_LABEL[item.kind]}: ${item.text}`}
      className={cx(
        "rounded-xl border bg-surface p-3",
        item.status === "approved" ? "border-good/40" : item.status === "rejected" ? "border-border opacity-60" : item.flags.length ? "border-warn/50" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {item.status === "approved" && <Badge tone="good">Approved</Badge>}
        {item.status === "rejected" && <Badge>Rejected</Badge>}
        {item.status === "pending" && (item.flags.length ? <Badge tone="warn">Needs a fix</Badge> : <Badge tone="accent">Ready to approve</Badge>)}
        {item.factIds.map((f) => (
          <span key={f} title={factText[f]} className="cursor-help">
            <Badge>{f}</Badge>
          </span>
        ))}
      </div>
      {canEdit && item.status !== "approved" ? (
        <div className="mt-2 flex items-start gap-2">
          <textarea
            aria-label={`Edit ${KIND_LABEL[item.kind].toLowerCase()}`}
            value={text}
            rows={item.kind === "description" ? 3 : 1}
            onChange={(e) => setText(e.target.value.replace(/\n/g, " "))}
            className="w-full resize-none rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
          <span className={cx("mt-1.5 shrink-0 text-xs tabular-nums", text.trim().length > limit ? "text-bad" : "text-muted")}>
            {text.trim().length}/{limit}
          </span>
        </div>
      ) : (
        <p className="mt-2 text-sm font-medium">
          {item.text} <span className="text-xs font-normal text-muted">{item.text.length}/{limit}</span>
        </p>
      )}
      {item.flags.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-warn">
          {item.flags.map((f) => (
            <li key={f}>⚠ {f}</li>
          ))}
        </ul>
      )}
      {item.original !== item.text && <p className="mt-1 text-xs text-muted">AI wrote: {item.original}</p>}
      {error && <p className="mt-1 text-xs text-bad" role="alert">{error}</p>}
      {canEdit && (
        <div className="mt-2 flex flex-wrap gap-2">
          {dirty ? (
            <Button type="button" variant="secondary" className="px-3 py-1 text-xs" disabled={pending} onClick={() => run(() => editAdItemAction(clientId, draftId, item.id, text))}>
              Save edit
            </Button>
          ) : item.status === "pending" ? (
            <>
              <Button
                type="button"
                className="px-3 py-1 text-xs"
                disabled={pending || item.flags.length > 0}
                title={item.flags.length ? "Fix the flagged problems first" : undefined}
                onClick={() => run(() => setAdItemStatusAction(clientId, draftId, item.id, "approved"))}
              >
                Approve
              </Button>
              <Button type="button" variant="ghost" className="px-3 py-1 text-xs" disabled={pending} onClick={() => run(() => setAdItemStatusAction(clientId, draftId, item.id, "rejected"))}>
                Reject
              </Button>
            </>
          ) : (
            <Button type="button" variant="ghost" className="px-3 py-1 text-xs" disabled={pending} onClick={() => run(() => setAdItemStatusAction(clientId, draftId, item.id, "pending"))}>
              {item.status === "approved" ? "Unapprove" : "Restore"}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

export function DeleteDraftButton({ clientId, draftId }: { clientId: string; draftId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this draft?")) start(async () => void (await deleteAdDraftAction(clientId, draftId)));
      }}
    >
      Delete draft
    </Button>
  );
}
