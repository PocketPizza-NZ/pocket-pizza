import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { haversineKm } from "@/lib/delivery";

const LineSchema = z.object({
  menuItemId: z.string(),
  name: z.string(),
  basePrice: z.number().nonnegative(),
  quantity: z.number().int().min(1),
  extras: z
    .array(z.object({ id: z.string(), name: z.string(), price: z.number() }))
    .default([]),
  emoji: z.string().optional(),
  color: z.array(z.string()).optional(),
  image: z.string().optional(),
  rating: z.string().nullable().optional(),
  spicy: z.boolean().optional(),
});

const OrderSchema = z.object({
  customer: z.object({
    fullName: z.string().min(2, "Please enter your full name"),
    mobile: z
      .string()
      .transform((s) => s.replace(/\s+/g, ""))
      .pipe(
        z
          .string()
          .regex(
            /^(\+?64|0)[2-9]\d{7,9}$/,
            "Enter a valid NZ mobile (e.g. 021 123 4567)"
          )
      ),
    email: z.string().email("Enter a valid email address"),
    deliveryAddress: z.string().min(5, "Enter your full delivery address"),
    deliveryNotes: z.string().optional(),
    // New: location-based fields (from Google Maps geocoding)
    deliveryLat: z.number().optional(),
    deliveryLng: z.number().optional(),
    distanceKm: z.number().optional(),
    deliveryCity: z.string().optional(),
    deliveryRegion: z.string().optional(),
    deliveryPostcode: z.string().optional(),
    deliveryCountry: z.string().optional(),
    deliveryFee: z.number().min(0),
    zoneMins: z.number().min(0),
  }),
  lines: z.array(LineSchema).min(1, "Cart is empty"),
  subtotal: z.number(),
  deliveryFee: z.number(),
  total: z.number(),
  payment: z.object({
    method: z.enum(["card", "stripe", "windcave", "poli", "afterpay"]),
    last4: z.string().default(""),
    ref: z.string().min(8, "Missing payment reference"),
    brand: z.string().optional(),
  }),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = OrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const { customer, lines, subtotal, deliveryFee, total, payment } = parsed.data;

  // Recompute totals server-side (security)
  const recomputedSubtotal = lines.reduce((s, l) => {
    const extrasSum = l.extras.reduce((a, e) => a + e.price, 0);
    return s + (l.basePrice + extrasSum) * l.quantity;
  }, 0);
  const recomputedTotal = recomputedSubtotal + (customer.deliveryFee || 0);
  if (Math.abs(recomputedTotal - total) > 0.5) {
    return NextResponse.json(
      { error: "Total mismatch — please refresh and try again." },
      { status: 400 }
    );
  }

  // Enforce max delivery distance (live from store settings, default 30km)
  const settings = await db.storeSettings.findUnique({ where: { id: "default" } });
  const STORE_LAT = settings?.shopLat ?? -36.8852;
  const STORE_LNG = settings?.shopLng ?? 174.7177;
  const MAX_KM = settings?.maxRadiusKm ?? 30;
  if (typeof customer.deliveryLat === "number" && typeof customer.deliveryLng === "number") {
    const distance = haversineKm(STORE_LAT, STORE_LNG, customer.deliveryLat, customer.deliveryLng);
    if (distance > MAX_KM) {
      return NextResponse.json(
        {
          error: `Sorry, we don't deliver beyond ${MAX_KM}km from our kitchen. Your address is ${distance.toFixed(1)}km away — please choose pickup instead.`,
          distanceKm: distance,
        },
        { status: 403 }
      );
    }
  }

  // Upsert customer by email
  const cust = await db.customer.upsert({
    where: { email: customer.email.toLowerCase() },
    update: { fullName: customer.fullName, mobile: customer.mobile },
    create: {
      fullName: customer.fullName,
      mobile: customer.mobile,
      email: customer.email.toLowerCase(),
    },
  });

  const reference = "PP-" + Math.random().toString(36).slice(2, 8).toUpperCase();

  const order = await db.order.create({
    data: {
      reference,
      customerId: cust.id,
      // No zoneId — we use the new location-based fields
      deliveryAddress: customer.deliveryAddress,
      deliveryCity: customer.deliveryCity ?? null,
      deliveryRegion: customer.deliveryRegion ?? null,
      deliveryPostcode: customer.deliveryPostcode ?? null,
      deliveryCountry: customer.deliveryCountry ?? "New Zealand",
      deliveryLat: customer.deliveryLat ?? null,
      deliveryLng: customer.deliveryLng ?? null,
      distanceKm: customer.distanceKm ?? null,
      deliveryNotes: customer.deliveryNotes ?? null,
      itemsJson: JSON.stringify(lines),
      subtotal: recomputedSubtotal,
      deliveryFee: customer.deliveryFee || 0,
      total: recomputedTotal,
      status: "PAID",
      paymentMethod: payment.method,
      paymentLast4: payment.last4 || null,
      paymentRef: payment.ref,
      paymentBrand: payment.brand ?? null,
      items: {
        create: lines.map((l) => {
          const extrasSum = l.extras.reduce((a, e) => a + e.price, 0);
          return {
            menuItemId: l.menuItemId,
            name: l.name,
            unitPrice: l.basePrice,
            quantity: l.quantity,
            extrasJson: JSON.stringify(l.extras),
            lineTotal: (l.basePrice + extrasSum) * l.quantity,
          };
        }),
      },
    },
    include: { items: true, customer: true },
  });

  // ─── Fire notifications (non-blocking, failsafe) ──────────────────────
  // Email + SMS to customer; admin alert email + SMS
  // These run in parallel and never block the order response.
  const notifications = [
    import("@/lib/notifications-email").then((m) =>
      Promise.all([
        m.sendOrderConfirmationEmail(order),
        m.sendAdminNewOrderEmail(order),
      ])
    ),
    import("@/lib/notifications-sms").then((m) =>
      Promise.all([
        m.sendOrderConfirmationSms(order),
        m.sendAdminNewOrderSms(order),
      ])
    ),
  ];
  // Don't await — fire and forget. Log only on errors.
  Promise.all(notifications).catch((e) =>
    console.error("[notifications] Background error:", e)
  );

  return NextResponse.json({ ok: true, order });
}
