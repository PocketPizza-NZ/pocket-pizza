import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const zones = await db.deliveryZone.findMany({
    where: { isActive: true },
    orderBy: { fee: "asc" },
  });
  return NextResponse.json({ zones });
}
