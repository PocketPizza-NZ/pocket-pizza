import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { createWindcaveSession } from "@/lib/payment-windcave";
import { initiatePoliPayment } from "@/lib/payment-poli";
import { createAfterpayOrder } from "@/lib/payment-afterpay";

/**
 * Creates a payment intent / checkout session for multiple NZ payment methods:
 *
 *  - card / stripe → Stripe PaymentIntent
 *  - windcave       → Windcave PXF2 hosted checkout session
 *  - poli           → POLi initiate transaction (returns redirect URL)
 *  - afterpay       → Afterpay order token (returns checkout URL)
 *
 * Each method activates automatically when its env vars are set. If env vars
 * are missing, falls back to a deterministic mock so the dev experience
 * stays smooth.
 *
 * Security (NZ compliance):
 *  - We never store raw PAN data; only the last 4 digits are persisted.
 *  - Cardholder name & billing postcode are validated server-side.
 *  - All transport is HTTPS (TLS 1.2+) — NZ Privacy Act 2020 aligned.
 *  - PCI-DSS scope is minimised by using each gateway's hosted checkout.
 */
const Body = z.object({
  amount: z.number().positive(), // NZD, major units (e.g. 14.50)
  currency: z.literal("nzd").or(z.literal("NZD")),
  method: z.enum(["card", "stripe", "windcave", "poli", "afterpay"]).default("card"),
  cardLast4: z.string().default("0000"),
  cardBrand: z.string().default("visa"),
  cardholderName: z.string().min(2),
  billingPostcode: z.string().min(4),
  // Customer context (used by POLi + Afterpay to pre-fill their checkout)
  customerEmail: z.string().email().optional(),
  customerMobile: z.string().optional(),
  customerFullName: z.string().optional(),
  orderReference: z.string().optional(),
  // Items list (used by Afterpay to show line items)
  items: z
    .array(z.object({ name: z.string(), quantity: z.number().int().positive(), price: z.number() }))
    .default([]),
  // Where to return the customer after gateway redirect
  returnUrl: z.string().optional(),
});

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("ReplaceMeWithYourReal")) return null;
  return new Stripe(key, { apiVersion: "2025-08-27.basil" as Stripe.LatestApiVersion });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payment request", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const {
    amount,
    method,
    cardLast4,
    cardBrand,
    cardholderName,
    billingPostcode,
    customerEmail,
    customerMobile,
    customerFullName,
    orderReference,
    items,
    returnUrl,
  } = parsed.data;

  const amountCents = Math.round(amount * 100);
  const ref = orderReference || `PP-${Date.now()}`;
  const retUrl =
    returnUrl ||
    `${process.env.NEXT_PUBLIC_APP_URL || "https://pocketpizza.co.nz"}/?payment=return`;

  // ─── Stripe (card) ──────────────────────────────────────────────────────
  if (method === "card" || method === "stripe") {
    const stripe = getStripe();
    if (stripe) {
      try {
        const intent = await stripe.paymentIntents.create({
          amount: amountCents,
          currency: "nzd",
          automatic_payment_methods: { enabled: true },
          description: `Pocket Pizza NZ order · ${cardholderName}`,
          metadata: {
            cardholder_name: cardholderName,
            billing_postcode: billingPostcode,
            card_last4: cardLast4,
            card_brand: cardBrand,
            merchant: "Pocket Pizza NZ",
            order_reference: ref,
          },
          payment_method_options: {
            card: { request_three_d_secure: "automatic" },
          },
          receipt_email: customerEmail,
        });
        return NextResponse.json({
          id: intent.id,
          clientSecret: intent.client_secret,
          amount: intent.amount,
          currency: intent.currency,
          status: intent.status,
          method,
          provider: "stripe",
          card: { last4: cardLast4, brand: cardBrand },
          created: new Date(intent.created * 1000).toISOString(),
          livemode: intent.livemode,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Stripe error";
        console.error("Stripe PaymentIntent creation failed:", msg);
        return NextResponse.json(
          { error: "Stripe payment intent failed", detail: msg },
          { status: 502 }
        );
      }
    }
    // Fall through to mock if no real Stripe key configured
  }

  // ─── Windcave hosted checkout ───────────────────────────────────────────
  if (method === "windcave") {
    try {
      const session = await createWindcaveSession({
        amount,
        reference: ref,
        returnUrl: retUrl,
        customerEmail: customerEmail || "guest@pocketpizza.co.nz",
        customerMobile,
      });
      return NextResponse.json({
        id: session.id,
        clientSecret: session.id,
        amount: amountCents,
        currency: "nzd",
        status: "requires_action",
        method,
        provider: "windcave",
        redirectUrl: session.checkoutUrl,
        card: { last4: cardLast4, brand: cardBrand },
        created: new Date().toISOString(),
        livemode: !!process.env.WINDCAVE_API_KEY,
      });
    } catch (e: unknown) {
      // If Windcave not configured, fall through to mock
      const msg = e instanceof Error ? e.message : "Windcave error";
      if (!msg.includes("not configured")) {
        console.error("Windcave session failed:", msg);
        return NextResponse.json({ error: "Windcave failed", detail: msg }, { status: 502 });
      }
    }
  }

  // ─── POLi bank transfer ─────────────────────────────────────────────────
  if (method === "poli") {
    try {
      const init = await initiatePoliPayment({
        amount,
        reference: ref,
        returnUrl: retUrl,
        customerEmail: customerEmail || "guest@pocketpizza.co.nz",
        customerMobile,
      });
      return NextResponse.json({
        id: init.token,
        clientSecret: init.token,
        amount: amountCents,
        currency: "nzd",
        status: "requires_action",
        method,
        provider: "poli",
        redirectUrl: init.redirectUrl,
        card: { last4: "", brand: "poli" },
        created: new Date().toISOString(),
        livemode: !!process.env.POLI_AUTH_CODE,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "POLi error";
      if (!msg.includes("not configured")) {
        console.error("POLi initiate failed:", msg);
        return NextResponse.json({ error: "POLi failed", detail: msg }, { status: 502 });
      }
    }
  }

  // ─── Afterpay BNPL ──────────────────────────────────────────────────────
  if (method === "afterpay") {
    try {
      const parts = (customerFullName || cardholderName || "Guest Customer").split(" ");
      const given = parts[0] || "Guest";
      const surname = parts.slice(1).join(" ") || "Customer";
      const session = await createAfterpayOrder({
        amount,
        reference: ref,
        consumer: {
          givenNames: given,
          surname,
          email: customerEmail || "guest@pocketpizza.co.nz",
          phoneNumber: customerMobile || "+64 21 000 0000",
        },
        billing: { postcode: billingPostcode },
        items: items.length
          ? items
          : [{ name: "Pocket Pizza order", quantity: 1, price: amount }],
        shippingAmount: 0,
        successUrl: `${retUrl}?status=success`,
        cancelUrl: `${retUrl}?status=cancelled`,
      });
      return NextResponse.json({
        id: session.token,
        clientSecret: session.token,
        amount: amountCents,
        currency: "nzd",
        status: "requires_action",
        method,
        provider: "afterpay",
        redirectUrl: session.checkoutUrl,
        card: { last4: "", brand: "afterpay" },
        created: new Date().toISOString(),
        livemode: !!process.env.AFTERPAY_MERCHANT_ID,
        expiresAt: session.expiresAt,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Afterpay error";
      if (!msg.includes("not configured")) {
        console.error("Afterpay create failed:", msg);
        return NextResponse.json({ error: "Afterpay failed", detail: msg }, { status: 502 });
      }
    }
  }

  // ─── Mock fallback (dev mode — no real gateway keys) ────────────────────
  const latency = method === "poli" || method === "afterpay" ? 900 : 600;
  await new Promise((r) => setTimeout(r, latency));

  const rand = Math.random().toString(36).slice(2, 14);
  let id: string;
  let provider: string;
  let redirectUrl: string | undefined;

  switch (method) {
    case "windcave":
      id = "windcave_" + rand;
      provider = "windcave";
      redirectUrl = `https://sec.windcave.com/checkout/demo/${rand}`;
      break;
    case "poli":
      id = "poli_" + rand;
      provider = "poli";
      redirectUrl = `https://www.polipayments.com/Initiate?token=${rand}`;
      break;
    case "afterpay":
      id = "ap_" + rand;
      provider = "afterpay";
      redirectUrl = `https://portal.afterpay.com/nz/orders/${rand}`;
      break;
    case "card":
    case "stripe":
    default:
      id = "pi_" + rand;
      provider = "stripe";
      break;
  }

  const clientSecret = id + "_secret_" + Math.random().toString(36).slice(2, 10);

  return NextResponse.json({
    id,
    clientSecret,
    amount: amountCents,
    currency: "nzd",
    status: "requires_confirmation",
    method,
    provider,
    redirectUrl,
    card: { last4: cardLast4, brand: cardBrand },
    created: new Date().toISOString(),
    livemode: false,
    mock: true,
  });
}
