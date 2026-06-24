import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin, unauthorized } from "@/lib/admin-auth";
import { z } from "zod";

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  const settings = await db.storeSettings.findUnique({ where: { id: "default" } });
  return NextResponse.json({ settings });
}

const UpdateSchema = z.object({
  shopName: z.string().min(1).optional(),
  shopTagline: z.string().optional(),
  shopEmail: z.string().email().optional(),
  shopPhone: z.string().optional().nullable(),
  shopAddress: z.string().min(5).optional(),
  shopLat: z.number().optional(),
  shopLng: z.number().optional(),
  openingHours: z.string().optional(), // JSON string
  baseFee: z.number().nonnegative().optional(),
  perKmAfter: z.number().nonnegative().optional(),
  freeRadiusKm: z.number().positive().optional(),
  maxRadiusKm: z.number().positive().optional(),
  estimatedMinsBase: z.number().int().positive().optional(),
  estimatedMinsPerKm: z.number().nonnegative().optional(),
  instagramUrl: z.string().optional().nullable(),
  facebookUrl: z.string().optional().nullable(),
  stripePublishableKey: z.string().optional().nullable(),
});

export async function PUT(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const settings = await db.storeSettings.upsert({
    where: { id: "default" },
    update: parsed.data,
    create: { id: "default", ...parsed.data },
  });
  return NextResponse.json({ settings });
}
