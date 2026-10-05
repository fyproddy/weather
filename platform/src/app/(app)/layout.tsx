import { db } from "@/db";
import { logoutAction } from "@/app/actions/auth";
import { ClientSwitcher } from "@/components/client-switcher";
import { Sidebar, type NavItem } from "@/components/sidebar";
import { getAgency } from "@/server/agency";
import { getActiveClient } from "@/server/active-client";
import { listClients } from "@/server/clients";
import { requireCtx } from "@/server/session";
import { SECTIONS } from "@/lib/sections";

const section = (slug: string): NavItem => {
  const s = SECTIONS.find((x) => x.slug === slug)!;
  // Google Ads (CSV imports) and Leads have working pages.
  return { href: `/${s.slug}`, label: s.label, phase: ["ads", "leads"].includes(s.slug) ? undefined : s.phase };
};

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const ctx = await requireCtx();
  const [agency, clients, active] = await Promise.all([
    getAgency(db, ctx),
    listClients(db, ctx),
    getActiveClient(ctx),
  ]);

  const groups = [
    { items: [{ href: "/", label: "Dashboard" }] },
    { title: "Get found", items: ["ads", "organic", "maps", "seo", "keywords", "competitors"].map(section) },
    { title: "Win customers", items: ["reviews", "leads", "content"].map(section) },
    { title: "Manage", items: [...["tasks", "reports"].map(section), { href: "/clients", label: "Clients" }, { href: "/settings", label: "Settings" }] },
  ];

  return (
    <div className="min-h-screen">
      <Sidebar groups={groups} agencyName={agency?.name ?? ""} />
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-end gap-4 border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-6">
          <ClientSwitcher clients={clients.map((c) => ({ id: c.id, name: c.name }))} activeId={active?.id ?? null} />
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted md:inline">
              {ctx.name} · <span className="capitalize">{ctx.role}</span>
            </span>
            <form action={logoutAction}>
              <button type="submit" className="text-muted hover:text-text">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
