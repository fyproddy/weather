import type { UserRole } from "@/db/schema";

const rank: Record<UserRole, number> = { viewer: 0, manager: 1, admin: 2 };

export function hasRole(role: UserRole, minimum: UserRole) {
  return rank[role] >= rank[minimum];
}

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
  }
}

export class NotFoundError extends Error {
  constructor(message = "Not found.") {
    super(message);
  }
}

/** Identity every data-layer call is scoped by. */
export type Ctx = { userId: string; agencyId: string; role: UserRole };

export function assertRole(ctx: Ctx, minimum: UserRole) {
  if (!hasRole(ctx.role, minimum)) throw new ForbiddenError();
}
