import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin, unauthorized } from "@/lib/admin-auth";
import { z } from "zod";

const UpdateSchema = z.object({
  status: z.enum(["PAID", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]).optional(),
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
  const order = await db.order.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ order });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) return unauthorized();
  const { id } = await params;
  // Delete items first (relation)
  await db.orderItem.deleteMany({ where: { orderId: id } });
  await db.order.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
