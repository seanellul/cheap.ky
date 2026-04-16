import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { staples, stapleProducts, storeProducts } from "@/lib/db/schema";
import { eq, and, ilike, isNotNull, inArray } from "drizzle-orm";
import { getPriceChanges } from "@/lib/db/price-changes";

export async function GET() {
  const allStaples = await db.select().from(staples).orderBy(staples.sortOrder);

  if (allStaples.length === 0) {
    return NextResponse.json({ staples: [] });
  }

  // Single query for all staple-product links instead of N per-staple queries
  const allLinks = await db
    .select({
      stapleId: stapleProducts.stapleId,
      storeId: stapleProducts.storeId,
      autoMatched: stapleProducts.autoMatched,
      productId: storeProducts.id,
      productName: storeProducts.name,
      price: storeProducts.price,
      salePrice: storeProducts.salePrice,
      size: storeProducts.size,
      imageUrl: storeProducts.imageUrl,
      updatedAt: storeProducts.updatedAt,
    })
    .from(stapleProducts)
    .innerJoin(storeProducts, eq(stapleProducts.storeProductId, storeProducts.id))
    .where(inArray(stapleProducts.stapleId, allStaples.map((s) => s.id)));

  // Group links by stapleId
  const linksByStaple = new Map<number, typeof allLinks>();
  for (const link of allLinks) {
    const existing = linksByStaple.get(link.stapleId) ?? [];
    existing.push(link);
    linksByStaple.set(link.stapleId, existing);
  }

  const allSpIds: number[] = allLinks.map((l) => l.productId);
  const priceChangeMap = await getPriceChanges(allSpIds);

  const result = allStaples.map((staple) => {
    const links = linksByStaple.get(staple.id) ?? [];
    const prices: Record<
      string,
      {
        productId: number;
        productName: string;
        price: number | null;
        salePrice: number | null;
        size: string | null;
        imageUrl: string | null;
        autoMatched: boolean | null;
        updatedAt: string | null;
      }
    > = {};
    const priceChanges: Record<string, { direction: "up" | "down"; amount: number }> = {};

    for (const link of links) {
      prices[link.storeId] = {
        productId: link.productId,
        productName: link.productName,
        price: link.price,
        salePrice: link.salePrice,
        size: link.size,
        imageUrl: link.imageUrl,
        autoMatched: link.autoMatched,
        updatedAt: link.updatedAt ? link.updatedAt.toISOString() : null,
      };
      const change = priceChangeMap.get(link.productId);
      if (change) priceChanges[link.storeId] = change;
    }

    return { id: staple.id, name: staple.name, category: staple.category, prices, priceChanges };
  });

  return NextResponse.json({ staples: result });
}

// POST: search for alternative products to link to a staple
export async function POST(req: NextRequest) {
  const { stapleId, storeId, query } = await req.json();

  const results = await db
    .select({
      id: storeProducts.id,
      name: storeProducts.name,
      price: storeProducts.price,
      salePrice: storeProducts.salePrice,
      size: storeProducts.size,
      imageUrl: storeProducts.imageUrl,
      categoryRaw: storeProducts.categoryRaw,
    })
    .from(storeProducts)
    .where(
      and(
        eq(storeProducts.storeId, storeId),
        isNotNull(storeProducts.price),
        ilike(storeProducts.name, `%${query}%`)
      )
    )
    .limit(20);

  return NextResponse.json({ results });
}

// PUT: manually link a store product to a staple
export async function PUT(req: NextRequest) {
  const { stapleId, storeId, storeProductId } = await req.json();

  // Delete existing link for this staple+store
  await db
    .delete(stapleProducts)
    .where(
      and(
        eq(stapleProducts.stapleId, stapleId),
        eq(stapleProducts.storeId, storeId)
      )
    );

  // Insert new manual link
  await db.insert(stapleProducts).values({
    stapleId,
    storeProductId,
    storeId,
    autoMatched: false,
  });

  return NextResponse.json({ ok: true });
}
