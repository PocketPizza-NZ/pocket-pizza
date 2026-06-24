import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  resetRateLimit,
  getClientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = checkRateLimit(ip);
  if (!limit.ok) {
    return rateLimitedResponse(limit.retryAfterSec || 1800);
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { password } = body;
  if (password === process.env.ADMIN_PASSWORD) {
    resetRateLimit(ip); // Clear failed attempts on success
    const res = NextResponse.json({ ok: true });
    res.cookies.set("pp_admin", process.env.ADMIN_PASSWORD!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    return res;
  }

  return NextResponse.json({ error: "Wrong password" }, { status: 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("pp_admin");
  return res;
}
