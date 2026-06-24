import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Windcave notification URL receiver.
 *
 * Windcave calls this URL when a transaction's status changes. Required for
 * the hosted checkout flow (where the customer is redirected to Windcave's
 * page and may not return to your success URL).
 *
 * Setup:
 *  1. The createWindcaveSession() function already passes this URL as
 *     notificationUrl when creating the session.
 *  2. In production, the URL must be publicly reachable:
 *       https://pocketpizza.co.nz/api/webhooks/windcave
 *  3. Verify the request comes from Windcave by checking the Authorization
 *     header (Windcave sends HTTP Basic auth with your merchant creds).
 */

export async function POST(req: NextRequest) {
  // Verify the request came from Windcave (HTTP Basic auth with merchant creds)
  const authHeader = req.headers.get("authorization");
  const username = process.env.WINDCAVE_USERNAME;
  const apiKey = process.env.WINDCAVE_API_KEY;

  if (username && apiKey && authHeader) {
    const expected = "Basic " + Buffer.from(`${username}:${apiKey}`).toString("base64");
    if (authHeader !== expected) {
      console.error("[windcave-webhook] Auth failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    console.warn(
      "[windcave-webhook] Dev mode — auth NOT verified. Set WINDCAVE_USERNAME + WINDCAVE_API_KEY in production."
    );
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Windcave sends: { id, type, status, ... }
  const txnId: string = payload.id ?? "";
  const status: string = payload.status ?? "";
  const authorized: boolean = payload.authorized === true;

  console.log(
    `[windcave-webhook] Received: id=${txnId}, status=${status}, authorized=${authorized}`
  );

  if (!txnId) {
    return NextResponse.json({ error: "Missing transaction id" }, { status: 400 });
  }

  try {
    const order = await db.order.findFirst({ where: { paymentRef: txnId } });
    if (!order) {
      console.warn(`[windcave-webhook] No order for txn=${txnId}`);
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (authorized || status === "APPROVED") {
      if (order.status !== "PAID") {
        await db.order.update({
          where: { id: order.id },
          data: { status: "PAID" },
        });
        console.log(`[windcave-webhook] ✓ Order ${order.reference} marked PAID`);
      }
    } else if (status === "DECLINED" || status === "ERROR") {
      await db.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });
      console.log(`[windcave-webhook] ✗ Order ${order.reference} CANCELLED`);
    }

    return NextResponse.json({ ok: true, status });
  } catch (e: unknown) {
    console.error("[windcave-webhook] Handler error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
