import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAfterpayOrder } from "@/lib/payment-afterpay";

/**
 * Afterpay webhook receiver.
 *
 * Afterpay sends webhooks when an order's status changes (payment captured,
 * refund issued, etc.). Required because the customer may close the browser
 * after returning from Afterpay checkout, before your client-side success
 * handler runs.
 *
 * Setup:
 *  1. https://merchant.afterpay.com → Settings → Webhooks
 *  2. Add endpoint: https://pocketpizza.co.nz/api/webhooks/afterpay
 *  3. Subscribe to: PAYMENT_APPROVED, PAYMENT_DECLINED, REFUND_APPROVED
 *  4. Copy the webhook secret to .env as AFTERPAY_WEBHOOK_SECRET
 */

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-afterpay-signature") ?? "";

  // Verify HMAC signature (if secret configured)
  const secret = process.env.AFTERPAY_WEBHOOK_SECRET;
  if (secret) {
    // Afterpay signs the body with HMAC-SHA256 using your webhook secret
    const crypto = await import("crypto");
    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("base64");
    if (signature !== expected) {
      console.error("[afterpay-webhook] Signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    console.warn(
      "[afterpay-webhook] Dev mode — signature NOT verified. Set AFTERPAY_WEBHOOK_SECRET in production."
    );
  }

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType: string = payload.eventType ?? payload.event_type ?? "";
  const token: string = payload.orderToken ?? payload.token ?? "";
  const reference: string = payload.merchantReference ?? payload.merchant_reference ?? "";

  console.log(
    `[afterpay-webhook] Received: event=${eventType}, token=${token}, ref=${reference}`
  );

  if (!token) {
    return NextResponse.json({ error: "Missing orderToken" }, { status: 400 });
  }

  try {
    // Re-fetch order from Afterpay to verify state
    const apOrder = await getAfterpayOrder(token);
    const order = await db.order.findFirst({ where: { paymentRef: token } });
    if (!order) {
      console.warn(`[afterpay-webhook] No order for token=${token}`);
      return NextResponse.json({ ok: true, ignored: true });
    }

    const status: string = apOrder.paymentState ?? apOrder.status ?? "";
    if (eventType === "PAYMENT_APPROVED" || status === "CAPTURED") {
      if (order.status !== "PAID") {
        await db.order.update({
          where: { id: order.id },
          data: { status: "PAID" },
        });
        console.log(`[afterpay-webhook] ✓ Order ${order.reference} marked PAID`);
      }
    } else if (eventType === "PAYMENT_DECLINED" || status === "FAILED") {
      await db.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });
      console.log(`[afterpay-webhook] ✗ Order ${order.reference} CANCELLED`);
    }

    return NextResponse.json({ ok: true, eventType });
  } catch (e: unknown) {
    console.error("[afterpay-webhook] Handler error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
