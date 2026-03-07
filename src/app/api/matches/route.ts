import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productMatches, storeProducts, stores } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const verified = req.nextUrl.searchParams.get("verified");

  const matches = await db
    .select({
      match: productMatches,
      product: products,
      storeProduct: storeProducts,
      store: stores,
    })
    .from(productMatches)
    .innerJoin(products, eq(productMatches.productId, products.id))
    .innerJoin(storeProducts, eq(productMatches.storeProductId, storeProducts.id))
    .innerJoin(stores, eq(storeProducts.storeId, stores.id))
    .where(
      verified === "false" ? eq(productMatches.verified, false) : undefined
    )
    .limit(200);

  return NextResponse.json({ matches });
}

export async function PUT(req: NextRequest) {
  const { matchId, verified, productId } = await req.json();

  const updates: Record<string, unknown> = {};
  if (verified !== undefined) updates.verified = verified;
  if (productId !== undefined) updates.productId = productId;

  await db.update(productMatches).set(updates).where(eq(productMatches.id, matchId));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { matchId } = await req.json();
  await db.delete(productMatches).where(eq(productMatches.id, matchId));
  return NextResponse.json({ ok: true });
}
