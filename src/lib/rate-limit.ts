import { NextRequest, NextResponse } from "next/server";

/**
 * Simple in-memory rate limiter for admin auth attempts.
 * In production: replace with Redis or Upstash for distributed rate limiting.
 *
 * Allows 5 attempts per IP per 15 minutes, then locks for 30 minutes.
 */

type Attempt = { count: number; firstAt: number; lockedUntil?: number };
const attempts = new Map<string, Attempt>();
const WINDOW_MS = 15 * 60 * 1000; // 15 min
const MAX_ATTEMPTS = 5;
const LOCK_MS = 30 * 60 * 1000; // 30 min

function cleanup() {
  const now = Date.now();
  for (const [ip, a] of attempts.entries()) {
    if (a.lockedUntil && a.lockedUntil < now) attempts.delete(ip);
    else if (!a.lockedUntil && a.firstAt + WINDOW_MS < now) attempts.delete(ip);
  }
}

export function checkRateLimit(ip: string): { ok: boolean; retryAfterSec?: number } {
  cleanup();
  const now = Date.now();
  const a = attempts.get(ip);

  if (a?.lockedUntil && a.lockedUntil > now) {
    return {
      ok: false,
      retryAfterSec: Math.ceil((a.lockedUntil - now) / 1000),
    };
  }

  if (!a) {
    attempts.set(ip, { count: 1, firstAt: now });
    return { ok: true };
  }

  a.count++;
  if (a.count >= MAX_ATTEMPTS) {
    a.lockedUntil = now + LOCK_MS;
    return { ok: false, retryAfterSec: Math.ceil(LOCK_MS / 1000) };
  }
  return { ok: true };
}

export function resetRateLimit(ip: string) {
  attempts.delete(ip);
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function rateLimitedResponse(retryAfterSec: number) {
  return NextResponse.json(
    {
      error: "Too many login attempts. Try again later.",
      retryAfterSec,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    }
  );
}
