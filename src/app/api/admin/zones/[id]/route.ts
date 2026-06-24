import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin, unauthorized } from "@/lib/admin-auth";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  region: z.string().optional(),
  postcode: z.string().optional().nullable(),
  fee: z.number().nonnegative().optional(),
  estimatedMins: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) return unauthorized();
  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const zone = await db.deliveryZone.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ zone });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) return unauthorized();
  const { id } = await params;
  await db.deliveryZone.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
