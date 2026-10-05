import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db, pool } from "@/db";
import { authenticate, createSession, deleteSession, getUserBySessionToken } from "@/server/auth-core";
import { hasAnyUser, setupAgency, SetupAlreadyDoneError } from "@/server/agency";
import { resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => pool.end());

const setup = { agencyName: "LeadPath Digital", name: "Roddy", email: "owner@example.com", password: "correct horse battery" };

describe("first-run setup", () => {
  it("creates the agency and an admin, then refuses to run again", async () => {
    expect(await hasAnyUser(db)).toBe(false);
    const { user } = await setupAgency(db, setup);
    expect(user.role).toBe("admin");
    await expect(setupAgency(db, { ...setup, email: "attacker@example.com" })).rejects.toBeInstanceOf(SetupAlreadyDoneError);
  });

  it("can't be raced into creating two admins", async () => {
    const results = await Promise.allSettled([
      setupAgency(db, setup),
      setupAgency(db, { ...setup, email: "other@example.com" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
});

describe("login and sessions", () => {
  it("authenticates with the right password only, case-insensitive email", async () => {
    await setupAgency(db, setup);
    expect(await authenticate(db, "OWNER@example.com", setup.password)).not.toBeNull();
    expect(await authenticate(db, setup.email, "wrong password")).toBeNull();
    expect(await authenticate(db, "nobody@example.com", setup.password)).toBeNull();
  });

  it("resolves a session token to its user until it is deleted", async () => {
    const { user } = await setupAgency(db, setup);
    const { token } = await createSession(db, user.id);
    expect((await getUserBySessionToken(db, token))?.id).toBe(user.id);
    expect(await getUserBySessionToken(db, token + "x")).toBeNull();
    await deleteSession(db, token);
    expect(await getUserBySessionToken(db, token)).toBeNull();
  });
});

describe("changing password", () => {
  it("needs the current password; ends existing sessions", async () => {
    const { changePassword, WrongPasswordError } = await import("@/server/agency");
    const { user, agency } = await setupAgency(db, setup);
    const ctx = { userId: user.id, agencyId: agency.id, role: "admin" as const };
    const { token } = await createSession(db, user.id);

    await expect(changePassword(db, ctx, { currentPassword: "wrong", newPassword: "brand new password" })).rejects.toBeInstanceOf(WrongPasswordError);
    await changePassword(db, ctx, { currentPassword: setup.password, newPassword: "brand new password" });

    expect(await getUserBySessionToken(db, token)).toBeNull();
    expect(await authenticate(db, setup.email, setup.password)).toBeNull();
    expect(await authenticate(db, setup.email, "brand new password")).not.toBeNull();
  });

  it("lets an admin use the setup code instead, but never a non-admin", async () => {
    const { changePassword, createUser, WrongPasswordError } = await import("@/server/agency");
    const { user, agency } = await setupAgency(db, setup);
    const admin = { userId: user.id, agencyId: agency.id, role: "admin" as const };
    await changePassword(db, admin, { setupCodeOk: true, newPassword: "recovered password" });
    expect(await authenticate(db, setup.email, "recovered password")).not.toBeNull();

    const v = await createUser(db, admin, { name: "V", email: "v@example.com", password: "viewer password", role: "viewer" });
    const viewer = { userId: v.id, agencyId: agency.id, role: "viewer" as const };
    await expect(changePassword(db, viewer, { setupCodeOk: true, newPassword: "hijacked password" })).rejects.toBeInstanceOf(WrongPasswordError);
  });
});
