import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin, unauthorized } from "@/lib/admin-auth";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  longDescription: z.string().optional().nullable(),
  price: z.number().nonnegative().optional(),
  rating: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  isPopular: z.boolean().optional(),
  isSpicy: z.boolean().optional(),
  isHighProtein: z.boolean().optional(),
  categoryId: z.string().min(1).optional(),
  position: z.number().optional(),
  extrasJson: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
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
  const item = await db.menuItem.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ item });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) return unauthorized();
  const { id } = await params;
  await db.menuItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
