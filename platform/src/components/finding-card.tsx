"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { decideAction } from "@/app/actions/recommendations";
import { ACTION_LABELS, type Finding } from "@/lib/ads-analysis";
import { formatKeyword } from "@/lib/keyword-format";
import { Badge, Button } from "./ui";

type Decision = "approved" | "dismissed" | "done" | null;

const KIND = {
  problem: { label: "Problem", tone: "bad" as const },
  opportunity: { label: "Opportunity", tone: "accent" as const },
  winner: { label: "Winner", tone: "good" as const },
};

export function FindingCard({
  clientId,
  finding,
  decision,
  canDecide,
}: {
  clientId: string;
  finding: Finding;
  decision: Decision;
  canDecide: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const decide = (status: Decision) =>
    start(async () => {
      const r = await decideAction(clientId, finding, status);
      setError(r.error);
    });
  const k = KIND[finding.kind];

  return (
    <article className="rounded-xl border border-border bg-surface p-4" aria-label={finding.title}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={k.tone}>{k.label}</Badge>
        {finding.kind === "problem" && finding.severity === "high" && <Badge tone="bad">High priority</Badge>}
        {decision === "approved" && <Badge tone="accent">Approved — to do</Badge>}
        {decision === "done" && <Badge tone="good">Done</Badge>}
        {decision === "dismissed" && <Badge>Dismissed</Badge>}
      </div>
      <h3 className="mt-2 font-semibold">{finding.title}</h3>
      <p className="mt-1 text-sm">
        <span className="font-medium">Why: </span>
        {finding.why}
      </p>
      {finding.action && (
        <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
          <span className="font-medium">{ACTION_LABELS[finding.action.type]}</span>
          {finding.action.text && (
            <>
              {" "}
              <code className="rounded bg-surface px-1">{formatKeyword(finding.action.text, finding.action.matchType)}</code>
            </>
          )}
          {" — "}
          <span className="text-muted">{finding.action.detail}</span>
        </p>
      )}
      {canDecide && finding.action && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {decision === null && (
            <>
              <Button type="button" className="px-3 py-1.5 text-xs" disabled={pending} onClick={() => decide("approved")}>
                Approve
              </Button>
              <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" disabled={pending} onClick={() => decide("dismissed")}>
                Dismiss
              </Button>
            </>
          )}
          {decision === "approved" && (
            <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" disabled={pending} onClick={() => decide("done")}>
              Mark done in Google Ads
            </Button>
          )}
          {decision !== null && (
            <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs" disabled={pending} onClick={() => decide(null)}>
              Undo
            </Button>
          )}
          {error && <span className="text-xs text-bad">{error}</span>}
        </div>
      )}
      {finding.action?.type === "test_new_ad" && (
        <Link href="/ads/creative" className="mt-2 inline-block text-sm text-accent hover:underline">
          Write a new ad with the ad writer →
        </Link>
      )}
    </article>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      className="px-3 py-1.5 text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}
