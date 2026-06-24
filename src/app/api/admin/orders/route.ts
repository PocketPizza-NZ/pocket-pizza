import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin, unauthorized } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized();
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { items: true, customer: true, zone: true },
  });
  return NextResponse.json({ orders });
}
