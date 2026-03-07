import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productMatches, storeProducts, stores } from "@/lib/db/schema";
import { eq, like, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const searchTerm = `%${q}%`;

  // Search canonical products
  const matchedProducts = await db
    .select()
    .from(products)
    .where(
      or(
        like(products.canonicalName, searchTerm),
        like(products.brand, searchTerm)
      )
    )
    .limit(50);

  // Also search store products directly for items without canonical matches
  const directMatches = await db
    .select()
    .from(storeProducts)
    .where(
      or(
        like(storeProducts.name, searchTerm),
        like(storeProducts.brand, searchTerm)
      )
    )
    .limit(100);

  // For each canonical product, get prices from all stores
  const results = [];

  for (const product of matchedProducts) {
    const matches = await db
      .select({
        storeProduct: storeProducts,
        store: stores,
      })
      .from(productMatches)
      .innerJoin(storeProducts, eq(productMatches.storeProductId, storeProducts.id))
      .innerJoin(stores, eq(storeProducts.storeId, stores.id))
      .where(eq(productMatches.productId, product.id));

    const prices: Record<string, { price: number | null; salePrice: number | null; name: string }> = {};
    for (const m of matches) {
      prices[m.store.id] = {
        price: m.storeProduct.price,
        salePrice: m.storeProduct.salePrice,
        name: m.storeProduct.name,
      };
    }

    results.push({
      id: product.id,
      name: product.canonicalName,
      brand: product.brand,
      size: product.size,
      imageUrl: product.imageUrl,
      prices,
    });
  }

  // Add store products that don't have canonical matches
  const matchedStoreProductIds = new Set<number>();
  for (const r of results) {
    const matches = await db
      .select()
      .from(productMatches)
      .where(eq(productMatches.productId, r.id));
    for (const m of matches) matchedStoreProductIds.add(m.storeProductId);
  }

  for (const sp of directMatches) {
    if (matchedStoreProductIds.has(sp.id)) continue;

    // Check if this store product has a canonical match
    const match = await db
      .select()
      .from(productMatches)
      .where(eq(productMatches.storeProductId, sp.id))
      .limit(1);

    if (match.length > 0) {
      // Already covered by canonical product results
      continue;
    }

    results.push({
      id: -sp.id, // Negative to indicate store-product-only
      name: sp.name,
      brand: sp.brand,
      size: sp.size,
      imageUrl: sp.imageUrl,
      prices: {
        [sp.storeId]: {
          price: sp.price,
          salePrice: sp.salePrice,
          name: sp.name,
        },
      },
    });
  }

  return NextResponse.json({ results: results.slice(0, 50) });
}
