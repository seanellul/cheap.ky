import { db } from "../db";
import { storeProducts, priceHistory, stores } from "../db/schema";
import { eq, and } from "drizzle-orm";
import type { StoreAdapter, RawProduct } from "./types";
import { normalizeUpc } from "../utils/upc";

export async function runIngestion(adapter: StoreAdapter) {
  const storeId = adapter.storeId;
  console.log(`[ingest] Starting ingestion for ${storeId}...`);

  const products = await adapter.fetch();
  console.log(`[ingest] Fetched ${products.length} products from ${storeId}`);

  let upserted = 0;
  let priceRecords = 0;

  let errors = 0;

  for (const product of products) {
    try {
      // Normalize UPC to 12-digit UPC-A / 13-digit EAN-13 for barcode scanner compatibility
      const normalizedUpc = normalizeUpc(product.upc);

      // Upsert store_product
      const existing = await db
        .select()
        .from(storeProducts)
        .where(
          and(
            eq(storeProducts.storeId, storeId),
            eq(storeProducts.sku, product.sku)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(storeProducts)
          .set({
            upc: normalizedUpc ?? existing[0].upc,
            name: product.name,
            brand: product.brand,
            description: product.description,
            price: product.price,
            salePrice: product.salePrice,
            unit: product.unit,
            size: product.size,
            categoryRaw: product.categoryRaw,
            imageUrl: product.imageUrl,
            inStock: product.inStock ?? true,
            sourceUrl: product.sourceUrl,
            rawData: product.rawData ? JSON.stringify(product.rawData) : existing[0].rawData,
            updatedAt: new Date(),
          })
          .where(eq(storeProducts.id, existing[0].id));

        // Log price history if price changed
        if (existing[0].price !== product.price || existing[0].salePrice !== product.salePrice) {
          await db.insert(priceHistory).values({
            storeProductId: existing[0].id,
            price: product.price,
            salePrice: product.salePrice,
          });
          priceRecords++;
        }
      } else {
        const [inserted] = await db
          .insert(storeProducts)
          .values({
            storeId,
            sku: product.sku,
            upc: normalizedUpc,
            name: product.name,
            brand: product.brand,
            description: product.description,
            price: product.price,
            salePrice: product.salePrice,
            unit: product.unit,
            size: product.size,
            categoryRaw: product.categoryRaw,
            imageUrl: product.imageUrl,
            inStock: product.inStock ?? true,
            sourceUrl: product.sourceUrl,
            rawData: product.rawData ? JSON.stringify(product.rawData) : null,
          })
          .returning();

        // Initial price history entry
        await db.insert(priceHistory).values({
          storeProductId: inserted.id,
          price: product.price,
          salePrice: product.salePrice,
        });
        priceRecords++;
      }
      upserted++;
    } catch (e) {
      errors++;
      if (errors <= 5) {
        console.error(`[ingest] Error on product ${product.sku}: ${e}`);
      }
    }
  }

  // Update store last_ingested_at
  await db
    .update(stores)
    .set({ lastIngestedAt: new Date() })
    .where(eq(stores.id, storeId));

  console.log(
    `[ingest] ${storeId}: ${upserted} products upserted, ${priceRecords} price records, ${errors} errors`
  );

  return { upserted, priceRecords };
}
