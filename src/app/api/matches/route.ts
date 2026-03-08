import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productMatches, storeProducts, stores } from "@/lib/db/schema";
import { eq, and, gte, lte, asc, desc, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const verified = params.get("verified");
  const minConfidence = params.get("minConfidence");
  const maxConfidence = params.get("maxConfidence");
  const matchMethod = params.get("matchMethod");
  const orderBy = params.get("orderBy") ?? "confidence_asc";
  const limit = Math.min(parseInt(params.get("limit") ?? "50"), 200);
  const offset = parseInt(params.get("offset") ?? "0");

  const conditions = [];
  if (verified === "false") conditions.push(eq(productMatches.verified, false));
  if (verified === "true") conditions.push(eq(productMatches.verified, true));
  if (minConfidence) conditions.push(gte(productMatches.confidence, parseFloat(minConfidence)));
  if (maxConfidence) conditions.push(lte(productMatches.confidence, parseFloat(maxConfidence)));
  if (matchMethod) conditions.push(eq(productMatches.matchMethod, matchMethod));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const orderClause =
    orderBy === "confidence_desc"
      ? desc(productMatches.confidence)
      : asc(productMatches.confidence);

  const [matches, countResult] = await Promise.all([
    db
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
      .where(whereClause)
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(productMatches)
      .innerJoin(products, eq(productMatches.productId, products.id))
      .innerJoin(storeProducts, eq(productMatches.storeProductId, storeProducts.id))
      .innerJoin(stores, eq(storeProducts.storeId, stores.id))
      .where(whereClause),
  ]);

  return NextResponse.json({
    matches,
    total: Number(countResult[0]?.count ?? 0),
  });
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
