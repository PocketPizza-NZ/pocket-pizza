import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const categories = await db.category.findMany({
    orderBy: { position: "asc" },
    include: {
      menuItems: {
        orderBy: { position: "asc" },
      },
    },
  });
  return NextResponse.json({ categories });
}
