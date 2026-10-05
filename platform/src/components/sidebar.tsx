"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cx } from "./ui";

export type NavItem = { href: string; label: string; phase?: number };

export function Sidebar({ groups, agencyName }: { groups: { title?: string; items: NavItem[] }[]; agencyName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  const nav = (
    <nav className="space-y-5 px-3 py-4" aria-label="Main">
      {groups.map((g, i) => (
        <div key={i}>
          {g.title && <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{g.title}</div>}
          <ul className="space-y-0.5">
            {g.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cx(
                    "flex items-center justify-between rounded-md px-2 py-1.5 text-sm",
                    isActive(item.href) ? "bg-accent-soft font-medium text-accent" : "text-text hover:bg-surface-2",
                  )}
                >
                  {item.label}
                  {item.phase && <span className="text-[10px] text-muted">P{item.phase}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <button
        type="button"
        className="fixed left-3 top-3 z-40 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm lg:hidden"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="sidebar"
      >
        {open ? "Close" : "Menu"}
      </button>
      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}
      <aside
        id="sidebar"
        className={cx(
          "fixed inset-y-0 left-0 z-40 w-60 overflow-y-auto border-r border-border bg-surface transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="border-b border-border px-5 py-4">
          <div className="font-bold tracking-tight">
            LeadPath <span className="text-accent">Growth</span>
          </div>
          <div className="truncate text-xs text-muted">{agencyName}</div>
        </div>
        {nav}
      </aside>
    </>
  );
}
