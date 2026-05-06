import { NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingest/runner";
import { FostersAdapter } from "@/lib/ingest/adapters/fosters";
import { CostULessAdapter } from "@/lib/ingest/adapters/costuless";
import { KirkMarketAdapter } from "@/lib/ingest/adapters/kirkmarket";
import { HurleysAdapter } from "@/lib/ingest/adapters/hurleys";
import { PricedRightAdapter } from "@/lib/ingest/adapters/pricedright";
import { runMatchingPipeline } from "@/lib/ingest/matching";
import type { StoreAdapter } from "@/lib/ingest/types";

export const maxDuration = 800;

// Rotate through stores — one per invocation.
// Cron runs every 3 days (0 6 */3 * *) so we rotate by day-of-year to ensure every store is hit.
const STORE_ROTATION: Array<{ name: string; create: () => StoreAdapter }> = [
  { name: "fosters", create: () => new FostersAdapter() },
  { name: "hurleys", create: () => new HurleysAdapter() },
  { name: "costuless", create: () => new CostULessAdapter() },
  { name: "pricedright", create: () => new PricedRightAdapter() },
  { name: "kirkmarket", create: () => new KirkMarketAdapter() },
];

function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - start) / 86_400_000);
}

export async function GET(request: Request) {
  // Auth check
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const vercelCronHeader = request.headers.get("x-vercel-cron-secret");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && vercelCronHeader !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pick store based on UTC day-of-year mod store count
  const now = new Date();
  const day = dayOfYear(now);
  const storeIndex = day % STORE_ROTATION.length;
  const adapter = STORE_ROTATION[storeIndex];

  console.log(`[rolling-ingest] Day ${day} → ingesting ${adapter.name} (index ${storeIndex})`);

  const results: Record<string, { ok: boolean; upserted?: number; priceRecords?: number; error?: string }> = {};

  try {
    const result = await runIngestion(adapter.create());
    results[adapter.name] = { ok: true, ...result };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    results[adapter.name] = { ok: false, error: message };
    console.error(`[rolling-ingest] Error ingesting ${adapter.name}: ${message}`);
  }

  // Run matching after each store to keep canonical products up to date
  try {
    await runMatchingPipeline({ skipAi: true });
    results["matching"] = { ok: true };
  } catch (e) {
    results["matching"] = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const allOk = Object.values(results).every((r) => r.ok);
  return NextResponse.json(
    {
      store: adapter.name,
      day,
      results,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 207 }
  );
}
