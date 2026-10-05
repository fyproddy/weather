import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db, pool } from "@/db";
import {
  addFact,
  addService,
  createClient,
  deleteClient,
  getClient,
  getClientProfile,
  getVerifiedFacts,
  listClients,
  removeChild,
  setClientArchived,
  setFactVerified,
  updateClient,
} from "@/server/clients";
import { ForbiddenError, NotFoundError } from "@/server/permissions";
import { clientInput } from "@/lib/validation";
import { makeAgency, makeUser, resetDb } from "./helpers";

const input = (name: string) => clientInput.parse({ name, city: "Johannesburg", website: "weatherguard.co.za" });

beforeEach(resetDb);
afterAll(() => pool.end());

describe("client isolation between agencies", () => {
  it("never lists or returns another agency's clients", async () => {
    const a = await makeAgency("A");
    const b = await makeAgency("B");
    const clientA = await createClient(db, a, input("WeatherGuard"));
    await createClient(db, b, input("DriveLab"));

    expect((await listClients(db, a)).map((c) => c.name)).toEqual(["WeatherGuard"]);
    expect((await listClients(db, b)).map((c) => c.name)).toEqual(["DriveLab"]);
    await expect(getClient(db, b, clientA.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("blocks another agency from editing, archiving, or adding records to a client", async () => {
    const a = await makeAgency("A");
    const b = await makeAgency("B");
    const clientA = await createClient(db, a, input("WeatherGuard"));

    await expect(updateClient(db, b, clientA.id, input("Hijacked"))).rejects.toBeInstanceOf(NotFoundError);
    await expect(setClientArchived(db, b, clientA.id, true)).rejects.toBeInstanceOf(NotFoundError);
    await expect(addService(db, b, clientA.id, { name: "x", description: null })).rejects.toBeInstanceOf(NotFoundError);
    expect((await getClient(db, a, clientA.id)).name).toBe("WeatherGuard");
  });

  it("can't delete a child record through a different client's id", async () => {
    const a = await makeAgency("A");
    const c1 = await createClient(db, a, input("One"));
    const c2 = await createClient(db, a, input("Two"));
    const svc = await addService(db, a, c1.id, { name: "Roof repairs", description: null });
    await expect(removeChild(db, a, c2.id, "service", svc.id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await getClientProfile(db, a, c1.id)).services).toHaveLength(1);
  });

  it("treats malformed ids as not found rather than erroring", async () => {
    const a = await makeAgency();
    await expect(getClient(db, a, "not-a-uuid")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("roles", () => {
  it("viewers can read but not change anything", async () => {
    const admin = await makeAgency();
    const viewer = await makeUser(admin, "viewer");
    const c = await createClient(db, admin, input("WeatherGuard"));
    expect(await listClients(db, viewer)).toHaveLength(1);
    await expect(createClient(db, viewer, input("X"))).rejects.toBeInstanceOf(ForbiddenError);
    await expect(updateClient(db, viewer, c.id, input("X"))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("only admins can permanently delete, and only after archiving", async () => {
    const admin = await makeAgency();
    const manager = await makeUser(admin, "manager");
    const c = await createClient(db, manager, input("WeatherGuard"));
    await expect(deleteClient(db, admin, c.id)).rejects.toThrow(/Archive the client/);
    await setClientArchived(db, manager, c.id, true);
    await expect(deleteClient(db, manager, c.id)).rejects.toBeInstanceOf(ForbiddenError);
    await deleteClient(db, admin, c.id);
    expect(await listClients(db, admin, { status: "archived" })).toHaveLength(0);
  });
});

describe("archiving", () => {
  it("moves clients between active and archived lists", async () => {
    const a = await makeAgency();
    const c = await createClient(db, a, input("WeatherGuard"));
    await setClientArchived(db, a, c.id, true);
    expect(await listClients(db, a)).toHaveLength(0);
    expect(await listClients(db, a, { status: "archived" })).toHaveLength(1);
    await setClientArchived(db, a, c.id, false);
    expect(await listClients(db, a)).toHaveLength(1);
  });
});

describe("verified facts", () => {
  it("only exposes facts after someone marks them verified", async () => {
    const a = await makeAgency();
    const c = await createClient(db, a, input("WeatherGuard"));
    const fact = await addFact(db, a, c.id, {
      category: "guarantee",
      statement: "Workmanship warranty on every job",
      source: "Client website",
    });
    expect(fact.verified).toBe(false);
    expect(await getVerifiedFacts(db, a, c.id)).toHaveLength(0);

    await setFactVerified(db, a, c.id, fact.id, true);
    const verified = await getVerifiedFacts(db, a, c.id);
    expect(verified.map((f) => f.statement)).toEqual(["Workmanship warranty on every job"]);
    expect(verified[0].verifiedById).toBe(a.userId);
  });
});

describe("validation", () => {
  it("normalises website and blank fields", () => {
    const parsed = clientInput.parse({ name: " WeatherGuard ", website: "weatherguard.co.za", phone: "" });
    expect(parsed.name).toBe("WeatherGuard");
    expect(parsed.website).toBe("https://weatherguard.co.za");
    expect(parsed.phone).toBeNull();
  });

  it("rejects a missing name and a bad email", () => {
    const r = clientInput.safeParse({ name: "", email: "nope" });
    expect(r.success).toBe(false);
  });
});
