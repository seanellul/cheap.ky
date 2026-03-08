/**
 * One-time migration: normalize all UPC codes in store_products and products tables.
 * Pads short UPCs to 12 digits (UPC-A standard) so barcode scanner lookups work.
 *
 * Usage: export $(grep -v '^#' .env.local | xargs) && npx tsx src/scripts/normalize-upcs.ts
 */
import { db } from "../lib/db";
import { storeProducts, products } from "../lib/db/schema";
import { isNotNull } from "drizzle-orm";
import { normalizeUpc } from "../lib/utils/upc";
import { eq } from "drizzle-orm";

async function main() {
  console.log("[normalize-upcs] Starting UPC normalization...");

  // 1. Normalize store_products UPCs
  const allSp = await db
    .select({ id: storeProducts.id, upc: storeProducts.upc })
    .from(storeProducts)
    .where(isNotNull(storeProducts.upc));

  let spUpdated = 0;
  let spCleared = 0;

  for (const row of allSp) {
    const normalized = normalizeUpc(row.upc);
    if (normalized !== row.upc) {
      await db
        .update(storeProducts)
        .set({ upc: normalized })
        .where(eq(storeProducts.id, row.id));
      if (normalized === null) {
        spCleared++;
      } else {
        spUpdated++;
      }
    }
  }

  console.log(
    `[normalize-upcs] store_products: ${spUpdated} normalized, ${spCleared} cleared (PLU/invalid), ${allSp.length - spUpdated - spCleared} already correct`
  );

  // 2. Normalize products (canonical) UPCs
  const allP = await db
    .select({ id: products.id, upc: products.upc })
    .from(products)
    .where(isNotNull(products.upc));

  let pUpdated = 0;
  let pCleared = 0;

  for (const row of allP) {
    const normalized = normalizeUpc(row.upc);
    if (normalized !== row.upc) {
      await db
        .update(products)
        .set({ upc: normalized })
        .where(eq(products.id, row.id));
      if (normalized === null) {
        pUpdated++;
      } else {
        pUpdated++;
      }
    }
  }

  console.log(
    `[normalize-upcs] products: ${pUpdated} normalized, ${allP.length - pUpdated} already correct`
  );

  console.log("[normalize-upcs] Done!");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
