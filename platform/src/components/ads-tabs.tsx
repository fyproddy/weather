"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cx } from "./ui";

const TABS = [
  ["/ads", "Overview"],
  ["/ads/analysis", "Analysis"],
  ["/ads/keywords", "Keywords"],
  ["/ads/search-terms", "Search terms"],
  ["/ads/creative", "Ad writer"],
] as const;

/** Tabs across the Google Ads pages; the date range carries over. */
export function AdsTabs() {
  const pathname = usePathname();
  const params = useSearchParams();
  const q = new URLSearchParams();
  for (const k of ["range", "from", "to"]) {
    const v = params.get(k);
    if (v) q.set(k, v);
  }
  const suffix = q.size ? `?${q}` : "";
  const isActive = (href: string) => (href === "/ads" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <nav aria-label="Google Ads" className="-mt-2 mb-6 flex gap-1 overflow-x-auto border-b border-border">
      {TABS.map(([href, label]) => (
        <Link
          key={href}
          href={`${href}${suffix}`}
          aria-current={isActive(href) ? "page" : undefined}
          className={cx(
            "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm",
            isActive(href) ? "border-accent font-medium text-accent" : "border-transparent text-muted hover:text-text",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
