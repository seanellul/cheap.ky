import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { smartCartItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { stapleIds } = await req.json();

  if (!Array.isArray(stapleIds) || stapleIds.length === 0) {
    return NextResponse.json({ ok: false, error: "stapleIds must be a non-empty array" }, { status: 400 });
  }

  let added = 0;

  for (const stapleId of stapleIds) {
    const existing = await db
      .select()
      .from(smartCartItems)
      .where(eq(smartCartItems.stapleId, stapleId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(smartCartItems)
        .set({ quantity: existing[0].quantity + 1 })
        .where(eq(smartCartItems.id, existing[0].id));
    } else {
      await db.insert(smartCartItems).values({ stapleId, quantity: 1 });
    }
    added++;
  }

  return NextResponse.json({ ok: true, added });
}
