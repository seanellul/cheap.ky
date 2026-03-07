import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { staples, stapleProducts, storeProducts } from "@/lib/db/schema";
import { eq, and, like, isNotNull, or } from "drizzle-orm";

export async function GET() {
  const allStaples = await db.select().from(staples).orderBy(staples.sortOrder);

  const result = [];

  for (const staple of allStaples) {
    // Get linked products for this staple
    const links = await db
      .select({
        storeId: stapleProducts.storeId,
        autoMatched: stapleProducts.autoMatched,
        productId: storeProducts.id,
        productName: storeProducts.name,
        price: storeProducts.price,
        salePrice: storeProducts.salePrice,
        size: storeProducts.size,
        imageUrl: storeProducts.imageUrl,
      })
      .from(stapleProducts)
      .innerJoin(storeProducts, eq(stapleProducts.storeProductId, storeProducts.id))
      .where(eq(stapleProducts.stapleId, staple.id));

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
      }
    > = {};

    for (const link of links) {
      prices[link.storeId] = {
        productId: link.productId,
        productName: link.productName,
        price: link.price,
        salePrice: link.salePrice,
        size: link.size,
        imageUrl: link.imageUrl,
        autoMatched: link.autoMatched,
      };
    }

    result.push({
      id: staple.id,
      name: staple.name,
      category: staple.category,
      prices,
    });
  }

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
        like(storeProducts.name, `%${query}%`)
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
