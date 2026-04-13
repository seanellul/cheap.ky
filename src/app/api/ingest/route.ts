import { NextRequest, NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingest/runner";
import { FostersAdapter } from "@/lib/ingest/adapters/fosters";
import { CostULessAdapter } from "@/lib/ingest/adapters/costuless";
import { KirkMarketAdapter } from "@/lib/ingest/adapters/kirkmarket";
import { HurleysAdapter } from "@/lib/ingest/adapters/hurleys";
import { PricedRightAdapter } from "@/lib/ingest/adapters/pricedright";
import { runMatchingPipeline } from "@/lib/ingest/matching";
import { db } from "@/lib/db";
import { stores, storeProducts } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import type { StoreAdapter } from "@/lib/ingest/types";

export const maxDuration = 300;

const adapters: Record<string, () => StoreAdapter> = {
  fosters: () => new FostersAdapter(),
  costuless: () => new CostULessAdapter(),
  kirkmarket: () => new KirkMarketAdapter(),
  hurleys: () => new HurleysAdapter(),
  pricedright: () => new PricedRightAdapter(),
};

export async function GET() {
  const allStores = await db.select().from(stores);

  const storeStats = [];
  for (const store of allStores) {
    const [productCount] = await db
      .select({ count: count() })
      .from(storeProducts)
      .where(eq(storeProducts.storeId, store.id));

    storeStats.push({
      ...store,
      productCount: productCount.count,
    });
  }

  return NextResponse.json({ stores: storeStats });
}

export async function POST(req: NextRequest) {
  const { storeId, runMatching } = await req.json();

  const factory = adapters[storeId];
  if (!factory) {
    return NextResponse.json({ error: `Unknown store: ${storeId}` }, { status: 400 });
  }

  try {
    const result = await runIngestion(factory());

    if (runMatching) {
      await runMatchingPipeline({ skipAi: true });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
