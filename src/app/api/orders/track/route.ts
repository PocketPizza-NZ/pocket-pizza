import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

/**
 * Public order tracking endpoint.
 *
 * Anyone with the order reference (or customer email + mobile) can look up
 * the order status. No auth required — reference is unguessable (6 chars
 * from 36-char alphabet = ~2.2B combinations).
 *
 * Returns only what the customer needs to see (no payment internals,
 * no internal IDs).
 */

const QuerySchema = z.object({
  reference: z.string().min(3).max(20).optional(),
  email: z.string().email().optional(),
  mobile: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide ?reference=PP-XXXXXX or ?email=...&mobile=..." },
      { status: 422 }
    );
  }

  const { reference, email, mobile } = parsed.data;

  let order;
  if (reference) {
    // Normalise reference (uppercase, strip whitespace)
    const ref = reference.toUpperCase().trim();
    order = await db.order.findFirst({
      where: { reference: ref },
      include: { items: true, customer: true },
    });
  } else if (email && mobile) {
    // Lookup by customer email + mobile (verifies identity)
    const normalisedEmail = email.toLowerCase().trim();
    const normalisedMobile = mobile.replace(/\s/g, "");
    order = await db.order.findFirst({
      where: {
        customer: { email: normalisedEmail, mobile: normalisedMobile },
      },
      orderBy: { createdAt: "desc" },
      include: { items: true, customer: true },
    });
  } else {
    return NextResponse.json(
      { error: "Provide either reference, or both email and mobile" },
      { status: 422 }
    );
  }

  if (!order) {
    return NextResponse.json(
      { error: "No order found. Check your reference number." },
      { status: 404 }
    );
  }

  // Mask customer email for privacy (j***@example.co.nz)
  const emailAddr = order.customer.email;
  const [localPart, domain] = emailAddr.split("@");
  const maskedEmail =
    localPart.length > 1
      ? `${localPart[0]}${"*".repeat(Math.max(2, localPart.length - 2))}@${domain}`
      : `*@${domain}`;

  return NextResponse.json({
    reference: order.reference,
    status: order.status,
    total: order.total,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    createdAt: order.createdAt,
    paymentMethod: order.paymentMethod,
    paymentLast4: order.paymentLast4,
    paymentBrand: order.paymentBrand,
    deliveryAddress: order.deliveryAddress,
    distanceKm: order.distanceKm,
    items: order.items.map((it) => ({
      name: it.name,
      quantity: it.quantity,
      lineTotal: it.lineTotal,
    })),
    customer: {
      fullName: order.customer.fullName,
      maskedEmail,
      maskedMobile: order.customer.mobile.replace(/^(\+?64|0)(\d{2})\d+/, "$1$2•• ••••"),
    },
  });
}
