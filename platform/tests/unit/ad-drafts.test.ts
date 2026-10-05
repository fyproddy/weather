import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db, pool } from "@/db";
import { AdDraftError, createAdDraft, editAdItem, getAdDraft, listAdDrafts, setAdItemStatus } from "@/server/ad-drafts";
import type { AdWriter, AdWriterInput } from "@/server/ad-writer";
import { addFact, addLocation, addService, createClient, setFactVerified } from "@/server/clients";
import { ForbiddenError, NotFoundError } from "@/server/permissions";
import { clientInput } from "@/lib/validation";
import { makeAgency, makeUser, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => pool.end());

let seen: AdWriterInput | null = null;
const fakeWriter: AdWriter = async (input) => {
  seen = input;
  return {
    headlines: [
      { text: "Roof Repairs in Sandton", fact_ids: [] },
      { text: "Free Roof Inspection", fact_ids: ["F1"] },
      { text: "Best Roofers in Pretoria", fact_ids: [] },
      { text: "  ", fact_ids: [] },
    ],
    descriptions: [{ text: "Liquid rubber waterproofing with a workmanship warranty. Book a free inspection.", fact_ids: ["F1", "F2", "F9"] }],
    callouts: [{ text: "15 Years Experience", fact_ids: [] }],
    notes: "Avoided price claims: no verified prices.",
  };
};

async function setup() {
  const ctx = await makeAgency();
  const client = await createClient(db, ctx, clientInput.parse({ name: "WeatherGuard", city: "Johannesburg", region: "Gauteng" }));
  await addService(db, ctx, client.id, { name: "Roof repairs", description: null });
  await addService(db, ctx, client.id, { name: "Liquid rubber waterproofing", description: null });
  await addLocation(db, ctx, client.id, { name: "Sandton", radiusKm: null });
  for (const statement of ["Free on-site inspection and quote", "Workmanship warranty on every job"]) {
    const f = await addFact(db, ctx, client.id, { category: "other", statement, source: null });
    await setFactVerified(db, ctx, client.id, f.id, true);
  }
  await addFact(db, ctx, client.id, { category: "claim", statement: "Over 15 years experience", source: "owner said" }); // NOT verified
  return { ctx, client };
}

describe("AI ad drafts", () => {
  it("sends only verified facts, services and areas to the writer", async () => {
    const { ctx, client } = await setup();
    await createAdDraft(db, ctx, client.id, { focus: "Roof repairs", instructions: null }, fakeWriter, "test-model");
    expect(seen!.facts).toEqual([
      { id: "F1", text: "Free on-site inspection and quote" },
      { id: "F2", text: "Workmanship warranty on every job" },
    ]);
    expect(seen!.facts.map((f) => f.text).join(" ")).not.toContain("15 years");
    expect(seen!.locations).toEqual(["Johannesburg", "Gauteng", "Sandton"]);
  });

  it("checks every line, drops empty ones, and ignores unknown fact labels", async () => {
    const { ctx, client } = await setup();
    const d = await createAdDraft(db, ctx, client.id, { focus: "Roof repairs", instructions: null }, fakeWriter, "test-model");
    expect(d.items).toHaveLength(5);
    const byText = (t: string) => d.items.find((i) => i.text === t)!;
    expect(byText("Roof Repairs in Sandton").flags).toEqual([]);
    expect(byText("Free Roof Inspection").flags).toEqual([]);
    expect(byText("Best Roofers in Pretoria").flags.join(" ")).toMatch(/superlative[\s\S]*Pretoria|Pretoria[\s\S]*superlative/);
    expect(byText("15 Years Experience").flags.length).toBeGreaterThan(0); // the fact exists but isn't verified
    expect(d.items.find((i) => i.kind === "description")!.factIds).toEqual(["F1", "F2"]);
    expect(d.writerNotes).toContain("Avoided price claims");
  });

  it("blocks approval of flagged lines until edited", async () => {
    const { ctx, client } = await setup();
    const d = await createAdDraft(db, ctx, client.id, { focus: "x", instructions: null }, fakeWriter, "m");
    const bad = d.items.find((i) => i.text.startsWith("Best"))!;
    await expect(setAdItemStatus(db, ctx, client.id, d.id, bad.id, "approved")).rejects.toBeInstanceOf(AdDraftError);
    const edited = await editAdItem(db, ctx, client.id, d.id, bad.id, "Trusted Roof Repairs");
    expect(edited.flags.join(" ")).toMatch(/reputation/);
    const fixed = await editAdItem(db, ctx, client.id, d.id, bad.id, "Roof Repairs Johannesburg");
    expect(fixed.flags).toEqual([]);
    expect((await setAdItemStatus(db, ctx, client.id, d.id, bad.id, "approved")).status).toBe("approved");
    const reloaded = await getAdDraft(db, ctx, client.id, d.id);
    expect(reloaded.items.find((i) => i.id === bad.id)).toMatchObject({ text: "Roof Repairs Johannesburg", original: "Best Roofers in Pretoria", status: "approved" });
  });

  it("verifying a fact later lets a line pass; un-verifying sends approved lines back", async () => {
    const { ctx, client } = await setup();
    const d = await createAdDraft(db, ctx, client.id, { focus: "x", instructions: null }, fakeWriter, "m");
    const yrs = d.items.find((i) => i.text === "15 Years Experience")!;
    const fact = (await (await import("@/server/clients")).getClientProfile(db, ctx, client.id)).facts.find((f) => f.statement.includes("15 years"))!;
    await setFactVerified(db, ctx, client.id, fact.id, true);
    await setAdItemStatus(db, ctx, client.id, d.id, yrs.id, "approved");
    await setFactVerified(db, ctx, client.id, fact.id, false);
    const again = await getAdDraft(db, ctx, client.id, d.id);
    expect(again.items.find((i) => i.id === yrs.id)!.status).toBe("pending");
  });

  it("needs services first; viewers can't generate or approve; other agencies can't see drafts", async () => {
    const { ctx, client } = await setup();
    const empty = await createClient(db, ctx, clientInput.parse({ name: "No services yet" }));
    await expect(createAdDraft(db, ctx, empty.id, { focus: "x", instructions: null }, fakeWriter, "m")).rejects.toThrow(/services/);
    const viewer = await makeUser(ctx, "viewer");
    await expect(createAdDraft(db, viewer, client.id, { focus: "x", instructions: null }, fakeWriter, "m")).rejects.toBeInstanceOf(ForbiddenError);
    const d = await createAdDraft(db, ctx, client.id, { focus: "x", instructions: null }, fakeWriter, "m");
    await expect(setAdItemStatus(db, viewer, client.id, d.id, d.items[0].id, "approved")).rejects.toBeInstanceOf(ForbiddenError);
    const other = await makeAgency("Other");
    await expect(getAdDraft(db, other, client.id, d.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(listAdDrafts(db, other, client.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
