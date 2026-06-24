import { NextRequest, NextResponse } from "next/server";

/**
 * Simple admin auth check.
 *
 * In production: replace with NextAuth / Clerk / Auth0 + a real role check.
 * For this demo we accept either:
 *   - the ADMIN_PASSWORD env var sent as `x-admin-password` header, OR
 *   - a session cookie `pp_admin` set after a successful login POST.
 */
export function isAdmin(req: NextRequest): boolean {
  const cookie = req.cookies.get("pp_admin")?.value;
  if (cookie === process.env.ADMIN_PASSWORD) return true;
  const header = req.headers.get("x-admin-password");
  if (header && header === process.env.ADMIN_PASSWORD) return true;
  return false;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
