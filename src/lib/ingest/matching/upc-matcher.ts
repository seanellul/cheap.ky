import { db } from "../../db";
import { storeProducts, products, productMatches } from "../../db/schema";
import { eq, isNotNull } from "drizzle-orm";

export async function runUpcMatching(): Promise<number> {
  console.log("[match:upc] Starting UPC matching...");

  // Get all store products with UPCs that aren't yet matched
  // UPCs are already normalized to 12/13 digits by the ingestion runner
  const withUpcs = await db
    .select()
    .from(storeProducts)
    .where(isNotNull(storeProducts.upc));

  // Group by normalized UPC
  const upcGroups = new Map<string, typeof withUpcs>();
  for (const sp of withUpcs) {
    if (!sp.upc) continue;
    const existing = upcGroups.get(sp.upc) || [];
    existing.push(sp);
    upcGroups.set(sp.upc, existing);
  }

  let matchCount = 0;

  for (const [upc, group] of upcGroups) {
    // Check if any of these already have a canonical product match
    let canonicalId: number | null = null;

    for (const sp of group) {
      const existingMatch = await db
        .select()
        .from(productMatches)
        .where(eq(productMatches.storeProductId, sp.id))
        .limit(1);

      if (existingMatch.length > 0) {
        canonicalId = existingMatch[0].productId;
        break;
      }
    }

    // Create canonical product if needed
    if (!canonicalId) {
      const representative = group[0];
      const [canonical] = await db
        .insert(products)
        .values({
          canonicalName: representative.name,
          brand: representative.brand,
          upc: upc,
          size: representative.size,
          imageUrl: representative.imageUrl,
        })
        .returning();
      canonicalId = canonical.id;
    }

    // Create matches for unmatched store products
    for (const sp of group) {
      const existingMatch = await db
        .select()
        .from(productMatches)
        .where(eq(productMatches.storeProductId, sp.id))
        .limit(1);

      if (existingMatch.length === 0) {
        await db.insert(productMatches).values({
          productId: canonicalId,
          storeProductId: sp.id,
          matchMethod: "upc",
          confidence: 1.0,
          verified: true,
        });
        matchCount++;
      }
    }
  }

  console.log(`[match:upc] Created ${matchCount} UPC matches`);
  return matchCount;
}
