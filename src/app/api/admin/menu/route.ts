import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin, unauthorized } from "@/lib/admin-auth";
import { z } from "zod";

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  const items = await db.menuItem.findMany({
    orderBy: [{ category: { position: "asc" } }, { position: "asc" }],
    include: { category: true },
  });
  return NextResponse.json({ items });
}

const CreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  longDescription: z.string().optional().nullable(),
  price: z.number().nonnegative(),
  rating: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  isPopular: z.boolean().default(false),
  isSpicy: z.boolean().default(false),
  isHighProtein: z.boolean().default(false),
  categoryId: z.string().min(1),
  position: z.number().default(0),
  extrasJson: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
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
  const item = await db.menuItem.create({ data: parsed.data });
  return NextResponse.json({ item });
}
