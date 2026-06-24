import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin, unauthorized } from "@/lib/admin-auth";
import { z } from "zod";

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  const zones = await db.deliveryZone.findMany({
    orderBy: { fee: "asc" },
  });
  return NextResponse.json({ zones });
}

const CreateSchema = z.object({
  name: z.string().min(1),
  region: z.string().default("Auckland"),
  postcode: z.string().optional().nullable(),
  fee: z.number().nonnegative().default(0),
  estimatedMins: z.number().int().positive().default(30),
  isActive: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const zone = await db.deliveryZone.create({ data: parsed.data });
  return NextResponse.json({ zone });
}
