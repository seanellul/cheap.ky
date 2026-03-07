import { db } from "../lib/db";
import { storeProducts } from "../lib/db/schema";
import { isNull } from "drizzle-orm";
import { parseUnitSize } from "../lib/utils/unit-price";
import { eq } from "drizzle-orm";

async function backfillUnitSizes() {
  console.log("[backfill] Fetching storeProducts with no unitSize...");

  const rows = await db
    .select({
      id: storeProducts.id,
      name: storeProducts.name,
      size: storeProducts.size,
    })
    .from(storeProducts)
    .where(isNull(storeProducts.unitSize));

  console.log(`[backfill] Found ${rows.length} products to parse`);

  let updated = 0;
  let skipped = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const updates: { id: number; unitSize: number; unitType: string }[] = [];

    for (const row of batch) {
      const parsed = parseUnitSize(row.name, row.size);
      if (parsed) {
        updates.push({ id: row.id, ...parsed });
      } else {
        skipped++;
      }
    }

    for (const u of updates) {
      await db
        .update(storeProducts)
        .set({ unitSize: u.unitSize, unitType: u.unitType })
        .where(eq(storeProducts.id, u.id));
    }

    updated += updates.length;

    if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= rows.length) {
      console.log(
        `[backfill] Progress: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length} (${updated} updated, ${skipped} skipped)`
      );
    }
  }

  console.log(
    `[backfill] Done. ${updated} updated, ${skipped} skipped (no parseable size).`
  );
}

backfillUnitSizes().catch(console.error);
