import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/setup", "/reset-password", "/api/health", "/r"];

/**
 * Optimistic check only: sends visitors without a session cookie to /login.
 * The real check (is the session valid?) happens in requireCtx() on the server.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isPublic && !req.cookies.has("session")) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico)$).*)"],
};
