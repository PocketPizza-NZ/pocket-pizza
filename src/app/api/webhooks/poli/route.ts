import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPoliTransaction } from "@/lib/payment-poli";

/**
 * POLi NotificationURL receiver.
 *
 * POLi calls this URL when the customer's bank transfer completes (success
 * or failure). It's the only reliable way to know a POLi payment succeeded
 * — the customer may close the browser before returning to your success URL.
 *
 * Setup:
 *  1. The initiatePoliPayment() function already passes this URL as
 *     NotificationURL when creating the transaction.
 *  2. In production, the URL must be publicly reachable:
 *       https://pocketpizza.co.nz/api/webhooks/poli
 *  3. No signature verification in POLi v2 — rely on the transaction token
 *     being unguessable + re-fetching the transaction to verify status.
 */

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // POLi sends: { TransactionToken, TransactionStatus, MerchantReference }
  const token = (body as any)?.TransactionToken ?? (body as any)?.token;
  const status = (body as any)?.TransactionStatus ?? (body as any)?.status;
  const reference = (body as any)?.MerchantReference ?? (body as any)?.reference;

  console.log(
    `[poli-webhook] Received: token=${token}, status=${status}, ref=${reference}`
  );

  if (!token) {
    return NextResponse.json({ error: "Missing TransactionToken" }, { status: 400 });
  }

  try {
    // Re-fetch the transaction to verify status (defence in depth — don't
    // trust the webhook payload, fetch the authoritative state)
    const txn = await getPoliTransaction(token);

    const order = await db.order.findFirst({ where: { paymentRef: token } });
    if (!order) {
      console.warn(`[poli-webhook] No order for token=${token}`);
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (txn.status === "COMPLETED") {
      if (order.status !== "PAID") {
        await db.order.update({
          where: { id: order.id },
          data: { status: "PAID", paymentRef: token },
        });
        console.log(`[poli-webhook] ✓ Order ${order.reference} marked PAID`);
      }
    } else if (txn.status === "FAILED") {
      await db.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });
      console.log(`[poli-webhook] ✗ Order ${order.reference} CANCELLED (POLi failed)`);
    }

    return NextResponse.json({ ok: true, status: txn.status });
  } catch (e: unknown) {
    console.error("[poli-webhook] Handler error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}

// GET is used by POLi's older notification format
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token) {
    return POST(
      new NextRequest(req.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ TransactionToken: token }),
      })
    );
  }
  return NextResponse.json({ ok: true });
}

export const runtime = "nodejs";
