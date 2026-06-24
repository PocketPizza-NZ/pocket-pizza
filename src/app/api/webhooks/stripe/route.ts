import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

/**
 * Stripe webhook receiver.
 *
 * Handles async payment events Stripe sends to your server. Critical for:
 *  - 3-D Secure challenges (payment_intent.payment_failed)
 *  - Async payment methods (bank transfers, BNPL redirects)
 *  - Disputes, refunds, chargebacks
 *  - Reconciling PAID orders if the client disconnects mid-checkout
 *
 * Setup:
 *  1. stripe login
 *  2. stripe listen --forward-to localhost:3000/api/webhooks/stripe
 *  3. In production: https://dashboard.stripe.com → Developers → Webhooks
 *     → Add endpoint → https://pocketpizza.co.nz/api/webhooks/stripe
 *     → Subscribe to: payment_intent.succeeded, payment_intent.payment_failed,
 *       charge.refunded, dispute.created
 *  4. Copy the signing secret (whsec_...) to .env as STRIPE_WEBHOOK_SECRET
 */

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("ReplaceMeWithYourReal")) return null;
  return new Stripe(key, { apiVersion: "2025-08-27.basil" as Stripe.LatestApiVersion });
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  // ─── Verify signature (production) ───────────────────────────────────
  if (stripe && webhookSecret) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid signature";
      console.error("[stripe-webhook] Signature verification failed:", msg);
      return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
    }
  } else {
    // ─── Dev mode (no real keys) — parse without verification ─────────
    try {
      event = JSON.parse(body) as Stripe.Event;
      console.warn(
        "[stripe-webhook] Dev mode — signature NOT verified. Set STRIPE_WEBHOOK_SECRET in production."
      );
    } catch (e: unknown) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  }

  console.log(`[stripe-webhook] Received event: ${event.type} (id=${event.id})`);

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSuccess(intent.id, intent);
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailure(intent.id, intent.last_payment_error?.message ?? "Payment failed");
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(charge.payment_intent as string, charge.amount_refunded);
        break;
      }
      case "dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDispute(dispute.payment_intent as string, dispute.amount, dispute.reason);
        break;
      }
      default:
        // Acknowledge unhandled events so Stripe doesn't retry
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true, type: event.type });
  } catch (e: unknown) {
    console.error("[stripe-webhook] Handler error:", e);
    // Return 500 so Stripe retries
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}

async function handlePaymentSuccess(paymentRef: string, intent: Stripe.PaymentIntent) {
  // Find the order by paymentRef
  const order = await db.order.findFirst({ where: { paymentRef } });
  if (!order) {
    console.warn(`[stripe-webhook] No order found for paymentRef=${paymentRef}`);
    return;
  }
  if (order.status === "PAID") {
    // Already processed — idempotent
    console.log(`[stripe-webhook] Order ${order.reference} already PAID — skipping`);
    return;
  }
  await db.order.update({
    where: { id: order.id },
    data: {
      status: "PAID",
      paymentRef,
      paymentBrand: intent.charges?.data?.[0]?.payment_method_details?.card?.brand ?? order.paymentBrand,
      paymentLast4: intent.charges?.data?.[0]?.payment_method_details?.card?.last4 ?? order.paymentLast4,
    },
  });
  console.log(`[stripe-webhook] ✓ Order ${order.reference} marked PAID`);
}

async function handlePaymentFailure(paymentRef: string, errorMsg: string) {
  const order = await db.order.findFirst({ where: { paymentRef } });
  if (!order) return;
  await db.order.update({
    where: { id: order.id },
    data: { status: "CANCELLED" },
  });
  console.log(
    `[stripe-webhook] ✗ Order ${order.reference} CANCELLED — ${errorMsg}`
  );
}

async function handleRefund(paymentRef: string, amountRefundedCents: number) {
  const order = await db.order.findFirst({ where: { paymentRef } });
  if (!order) return;
  // If full amount refunded, mark as CANCELLED; partial refunds keep status
  const refundedNzd = amountRefundedCents / 100;
  if (refundedNzd >= order.total) {
    await db.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
    console.log(`[stripe-webhook] Order ${order.reference} fully refunded → CANCELLED`);
  } else {
    console.log(
      `[stripe-webhook] Order ${order.reference} partially refunded $${refundedNzd.toFixed(2)}`
    );
  }
}

async function handleDispute(
  paymentRef: string,
  amountCents: number,
  reason: string
) {
  const order = await db.order.findFirst({ where: { paymentRef } });
  if (!order) return;
  console.warn(
    `[stripe-webhook] ⚠️ DISPUTE on order ${order.reference} — $${(amountCents / 100).toFixed(2)} — reason: ${reason}`
  );
  // Don't change status automatically — flag for manual review
  // (Admin can see the dispute in Stripe dashboard and act on it)
}

// Stripe webhooks must respond quickly — disable body parsing
export const runtime = "nodejs";
