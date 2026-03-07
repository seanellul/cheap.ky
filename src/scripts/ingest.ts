import { runIngestion } from "../lib/ingest/runner";
import { FostersAdapter } from "../lib/ingest/adapters/fosters";
import { CostULessAdapter } from "../lib/ingest/adapters/costuless";
import { KirkMarketAdapter } from "../lib/ingest/adapters/kirkmarket";
import { HurleysAdapter } from "../lib/ingest/adapters/hurleys";
import { PricedRightAdapter } from "../lib/ingest/adapters/pricedright";
import type { StoreAdapter } from "../lib/ingest/types";

const adapters: Record<string, () => StoreAdapter> = {
  fosters: () => new FostersAdapter(),
  costuless: () => new CostULessAdapter(),
  kirkmarket: () => new KirkMarketAdapter(),
  hurleys: () => new HurleysAdapter(),
  pricedright: () => new PricedRightAdapter(),
};

async function main() {
  const storeArg = process.argv[2];

  if (storeArg && storeArg !== "all") {
    const factory = adapters[storeArg];
    if (!factory) {
      console.error(`Unknown store: ${storeArg}. Available: ${Object.keys(adapters).join(", ")}`);
      process.exit(1);
    }
    await runIngestion(factory());
  } else {
    console.log("Running ingestion for all stores...");
    for (const [name, factory] of Object.entries(adapters)) {
      try {
        await runIngestion(factory());
      } catch (e) {
        console.error(`[${name}] Ingestion failed:`, e);
      }
    }
  }
}

main().catch((e) => {
  console.error("Ingestion failed:", e);
  process.exit(1);
});
