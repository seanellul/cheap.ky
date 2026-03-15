import { NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingest/runner";
import { FostersAdapter } from "@/lib/ingest/adapters/fosters";
import { CostULessAdapter } from "@/lib/ingest/adapters/costuless";
import { KirkMarketAdapter } from "@/lib/ingest/adapters/kirkmarket";
import { HurleysAdapter } from "@/lib/ingest/adapters/hurleys";
import { PricedRightAdapter } from "@/lib/ingest/adapters/pricedright";
import { runMatchingPipeline } from "@/lib/ingest/matching";
import type { StoreAdapter } from "@/lib/ingest/types";

export const maxDuration = 300;

const adapters: Array<{ name: string; create: () => StoreAdapter }> = [
  { name: "fosters", create: () => new FostersAdapter() },
  { name: "costuless", create: () => new CostULessAdapter() },
  { name: "kirkmarket", create: () => new KirkMarketAdapter() },
  { name: "hurleys", create: () => new HurleysAdapter() },
  { name: "pricedright", create: () => new PricedRightAdapter() },
];

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const vercelCronHeader = request.headers.get("x-vercel-cron-secret");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && vercelCronHeader !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, { ok: boolean; inserted?: number; updated?: number; error?: string }> = {};

  for (const adapter of adapters) {
    try {
      const result = await runIngestion(adapter.create());
      results[adapter.name] = { ok: true, ...result };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      results[adapter.name] = { ok: false, error: message };
    }
  }

  // Run matching pipeline after all stores are ingested
  try {
    await runMatchingPipeline({ skipAi: true });
  } catch (e) {
    results["matching"] = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const allOk = Object.values(results).every((r) => r.ok);
  return NextResponse.json(
    { results, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 207 }
  );
}
