import Fuse from "fuse.js";
import { db } from "../../db";
import { storeProducts, products, productMatches } from "../../db/schema";
import { eq, notInArray } from "drizzle-orm";
import { normalizeName } from "./normalize";

const CONFIDENCE_THRESHOLD = 0.85;

export async function runFuzzyMatching(): Promise<number> {
  console.log("[match:fuzzy] Starting fuzzy name matching...");

  // Get all store products not yet matched
  const matchedIds = await db
    .select({ id: productMatches.storeProductId })
    .from(productMatches);
  const matchedIdSet = new Set(matchedIds.map((m) => m.id));

  const allStoreProducts = await db.select().from(storeProducts);
  const unmatched = allStoreProducts.filter((sp) => !matchedIdSet.has(sp.id));

  if (unmatched.length === 0) {
    console.log("[match:fuzzy] No unmatched products to process");
    return 0;
  }

  // Get existing canonical products
  const canonicals = await db.select().from(products);

  let matchCount = 0;

  if (canonicals.length > 0) {
    // Try to match unmatched products against existing canonicals
    const fuse = new Fuse(
      canonicals.map((c) => ({ ...c, normalized: normalizeName(c.canonicalName) })),
      {
        keys: ["normalized"],
        threshold: 0.3,
        includeScore: true,
      }
    );

    for (const sp of unmatched) {
      const normalized = normalizeName(sp.name);
      const results = fuse.search(normalized);

      if (results.length > 0 && results[0].score !== undefined) {
        const confidence = 1 - results[0].score;
        if (confidence >= CONFIDENCE_THRESHOLD) {
          await db.insert(productMatches).values({
            productId: results[0].item.id,
            storeProductId: sp.id,
            matchMethod: "fuzzy_name",
            confidence,
            verified: false,
          });
          matchCount++;
          continue;
        }
      }

      // No match found - create new canonical product
      const [canonical] = await db
        .insert(products)
        .values({
          canonicalName: sp.name,
          brand: sp.brand,
          size: sp.size,
          imageUrl: sp.imageUrl,
        })
        .returning();

      await db.insert(productMatches).values({
        productId: canonical.id,
        storeProductId: sp.id,
        matchMethod: "fuzzy_name",
        confidence: 1.0,
        verified: false,
      });
      matchCount++;
    }
  } else {
    // No canonicals exist yet - group unmatched by fuzzy similarity
    const processed = new Set<number>();

    for (const sp of unmatched) {
      if (processed.has(sp.id)) continue;

      const normalized = normalizeName(sp.name);
      const remaining = unmatched.filter((u) => !processed.has(u.id) && u.id !== sp.id);

      const fuse = new Fuse(
        remaining.map((r) => ({ ...r, normalized: normalizeName(r.name) })),
        {
          keys: ["normalized"],
          threshold: 0.3,
          includeScore: true,
        }
      );

      const similar = fuse
        .search(normalized)
        .filter((r) => r.score !== undefined && 1 - r.score >= CONFIDENCE_THRESHOLD);

      // Create canonical product
      const [canonical] = await db
        .insert(products)
        .values({
          canonicalName: sp.name,
          brand: sp.brand,
          upc: sp.upc,
          size: sp.size,
          imageUrl: sp.imageUrl,
        })
        .returning();

      // Match the source product
      await db.insert(productMatches).values({
        productId: canonical.id,
        storeProductId: sp.id,
        matchMethod: "fuzzy_name",
        confidence: 1.0,
        verified: false,
      });
      processed.add(sp.id);
      matchCount++;

      // Match similar products
      for (const result of similar) {
        const confidence = 1 - result.score!;
        await db.insert(productMatches).values({
          productId: canonical.id,
          storeProductId: result.item.id,
          matchMethod: "fuzzy_name",
          confidence,
          verified: false,
        });
        processed.add(result.item.id);
        matchCount++;
      }
    }
  }

  console.log(`[match:fuzzy] Created ${matchCount} fuzzy matches`);
  return matchCount;
}
