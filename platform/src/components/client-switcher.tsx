"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setActiveClientAction } from "@/app/actions/active-client";

export function ClientSwitcher({ clients, activeId }: { clients: { id: string; name: string }[]; activeId: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (clients.length === 0) return null;
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-muted sm:inline">Client</span>
      <select
        aria-label="Active client"
        className="max-w-44 sm:max-w-72 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm font-medium"
        value={activeId ?? ""}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            await setActiveClientAction(e.target.value);
            router.refresh();
          })
        }
      >
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
