import { db } from "../lib/db";
import { storeProducts } from "../lib/db/schema";
import { parseSize } from "../lib/utils/unit-price";
import { eq, isNull } from "drizzle-orm";

async function backfillUnitPrices() {
  console.log("[backfill] Fetching products missing unit_size...");

  const rows = await db
    .select({
      id: storeProducts.id,
      size: storeProducts.size,
      name: storeProducts.name,
    })
    .from(storeProducts)
    .where(isNull(storeProducts.unitSize));

  console.log(`[backfill] Found ${rows.length} products to backfill`);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const parsed = parseSize(row.size, row.name);
    if (parsed) {
      await db
        .update(storeProducts)
        .set({ unitSize: parsed.size, unitType: parsed.unit })
        .where(eq(storeProducts.id, row.id));
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`[backfill] Done: ${updated} updated, ${skipped} skipped (no parseable size)`);
}

backfillUnitPrices().catch(console.error);
