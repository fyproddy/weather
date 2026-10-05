import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db, pool } from "@/db";
import { leads } from "@/db/schema";
import { createClient, setClientArchived } from "@/server/clients";
import { createLead, deleteLead, getLead, leadStatsByClient, listLeads, setLeadStatus, updateLead } from "@/server/leads";
import { ForbiddenError, NotFoundError } from "@/server/permissions";
import { clientInput, leadInput } from "@/lib/validation";
import { makeAgency, makeUser, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => pool.end());

const lead = (over: Record<string, string> = {}) =>
  leadInput.parse({ name: "Thabo", phone: "082 555 1234", channel: "call", source: "google_ads", receivedOn: "2026-10-01", ...over });

async function setup() {
  const ctx = await makeAgency();
  const client = await createClient(db, ctx, clientInput.parse({ name: "WeatherGuard" }));
  return { ctx, client };
}

describe("leads", () => {
  it("creates, lists by date range and filters", async () => {
    const { ctx, client } = await setup();
    await createLead(db, ctx, client.id, lead());
    await createLead(db, ctx, client.id, lead({ name: "Lerato", source: "referral", receivedOn: "2026-09-15" }));
    const oct = await listLeads(db, ctx, client.id, { from: "2026-10-01", to: "2026-10-31" });
    expect(oct.map((l) => l.name)).toEqual(["Thabo"]);
    const all = await listLeads(db, ctx, client.id, { from: "2026-09-01", to: "2026-10-31" }, { source: "referral" });
    expect(all.map((l) => l.name)).toEqual(["Lerato"]);
  });

  it("counts a lead on the right local day (Johannesburg, UTC+2)", async () => {
    const { ctx, client } = await setup();
    const l = await createLead(db, ctx, client.id, lead());
    // 23:30 local on 1 Oct = 21:30 UTC — must count on 1 Oct, not 2 Oct; 00:30 local on 2 Oct = 22:30 UTC on 1 Oct.
    const { eq } = await import("drizzle-orm");
    await db.update(leads).set({ receivedAt: new Date("2026-10-01T21:30:00Z") }).where(eq(leads.id, l.id));
    expect(await listLeads(db, ctx, client.id, { from: "2026-10-01", to: "2026-10-01" })).toHaveLength(1);
    await db.update(leads).set({ receivedAt: new Date("2026-10-01T22:30:00Z") }).where(eq(leads.id, l.id));
    expect(await listLeads(db, ctx, client.id, { from: "2026-10-01", to: "2026-10-01" })).toHaveLength(0);
    expect(await listLeads(db, ctx, client.id, { from: "2026-10-02", to: "2026-10-02" })).toHaveLength(1);
  });

  it("stats: totals, won value and sources", async () => {
    const { ctx, client } = await setup();
    const a = await createLead(db, ctx, client.id, lead());
    await createLead(db, ctx, client.id, lead({ name: "B", source: "google_maps" }));
    const c = await createLead(db, ctx, client.id, lead({ name: "C" }));
    await updateLead(db, ctx, client.id, a.id, lead({ status: "won", value: "4500" }));
    await setLeadStatus(db, ctx, client.id, c.id, "lost");
    const stats = (await leadStatsByClient(db, ctx, { from: "2026-10-01", to: "2026-10-31" })).get(client.id)!;
    expect(stats).toMatchObject({ total: 3, won: 1, lost: 1, open: 1, wonValue: 4500, bySource: { google_ads: 2, google_maps: 1 } });
  });

  it("keeps leads private to the agency and read-only for viewers", async () => {
    const { ctx, client } = await setup();
    const other = await makeAgency("Other");
    const viewer = await makeUser(ctx, "viewer");
    const l = await createLead(db, ctx, client.id, lead());
    await expect(getLead(db, other, client.id, l.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(listLeads(db, other, client.id, { from: "2026-01-01", to: "2026-12-31" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteLead(db, other, client.id, l.id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await leadStatsByClient(db, other, { from: "2026-01-01", to: "2026-12-31" })).size).toBe(0);
    await expect(createLead(db, viewer, client.id, lead())).rejects.toBeInstanceOf(ForbiddenError);
    await expect(setLeadStatus(db, viewer, client.id, l.id, "won")).rejects.toBeInstanceOf(ForbiddenError);
    expect(await listLeads(db, viewer, client.id, { from: "2026-01-01", to: "2026-12-31" })).toHaveLength(1);
  });

  it("can't reach a lead through a different client", async () => {
    const { ctx, client } = await setup();
    const other = await createClient(db, ctx, clientInput.parse({ name: "DriveLab" }));
    const l = await createLead(db, ctx, client.id, lead());
    await expect(getLead(db, ctx, other.id, l.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteLead(db, ctx, other.id, l.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses new leads on archived clients and validates input", async () => {
    const { ctx, client } = await setup();
    await setClientArchived(db, ctx, client.id, true);
    await expect(createLead(db, ctx, client.id, lead())).rejects.toBeInstanceOf(NotFoundError);
    expect(leadInput.safeParse({ name: "", channel: "call", source: "google_ads" }).success).toBe(false);
    expect(leadInput.safeParse({ name: "X", channel: "fax", source: "google_ads" }).success).toBe(false);
  });
});
