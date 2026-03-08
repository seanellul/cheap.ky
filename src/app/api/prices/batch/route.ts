import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productMatches, storeProducts, stores } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids");
  if (!idsParam) {
    return NextResponse.json({ prices: {} });
  }

  const ids = idsParam
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n))
    .slice(0, 50);

  if (ids.length === 0) {
    return NextResponse.json({ prices: {} });
  }

  // Get all matches for these product IDs
  const matches = await db
    .select({
      productId: productMatches.productId,
      storeId: storeProducts.storeId,
      price: storeProducts.price,
      salePrice: storeProducts.salePrice,
    })
    .from(productMatches)
    .innerJoin(storeProducts, eq(productMatches.storeProductId, storeProducts.id))
    .where(inArray(productMatches.productId, ids));

  const prices: Record<number, Record<string, number | null>> = {};

  for (const m of matches) {
    if (!prices[m.productId]) prices[m.productId] = {};
    prices[m.productId][m.storeId] = m.salePrice ?? m.price;
  }

  return NextResponse.json({ prices });
}
