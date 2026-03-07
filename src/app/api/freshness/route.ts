import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";

export async function GET() {
  const rows = await db
    .select({
      id: stores.id,
      name: stores.name,
      lastIngestedAt: stores.lastIngestedAt,
    })
    .from(stores);

  const storeData = rows.map((r) => ({
    id: r.id,
    name: r.name,
    lastIngestedAt: r.lastIngestedAt?.toISOString() ?? null,
  }));

  // Most recent ingest across all stores
  const timestamps = rows
    .map((r) => r.lastIngestedAt?.getTime() ?? 0)
    .filter((t) => t > 0);
  const lastUpdated = timestamps.length > 0
    ? new Date(Math.max(...timestamps)).toISOString()
    : null;

  return NextResponse.json({ lastUpdated, stores: storeData });
}
