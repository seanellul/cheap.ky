import { NextRequest, NextResponse } from "next/server";
import { rawSql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids") || "";
  const ids = idsParam
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0);

  if (ids.length === 0) {
    return NextResponse.json({ items: [] });
  }

  // Cap at 100 to prevent abuse
  const limitedIds = ids.slice(0, 100);
  const placeholders = limitedIds.map((_, i) => `$${i + 1}`).join(",");

  // Get product info
  const products = await rawSql(
    `SELECT id, canonical_name, brand, size, image_url
     FROM products
     WHERE id IN (${placeholders})`,
    limitedIds
  );

  // Get store prices for these products
  const priceRows = await rawSql(
    `SELECT pm.product_id, sp.store_id, sp.price, sp.sale_price, sp.name, sp.updated_at
     FROM product_matches pm
     JOIN store_products sp ON pm.store_product_id = sp.id
     WHERE pm.product_id IN (${placeholders}) AND pm.match_method = 'upc'
       AND COALESCE(sp.sale_price, sp.price) > 0`,
    limitedIds
  );

  const storePrices: Record<
    number,
    Record<string, { price: number | null; salePrice: number | null; updatedAt: string | null }>
  > = {};
  for (const row of priceRows) {
    const pid = Number(row.product_id);
    const storeId = String(row.store_id);
    if (!storePrices[pid]) storePrices[pid] = {};
    storePrices[pid][storeId] = {
      price: row.price != null ? Number(row.price) : null,
      salePrice: row.sale_price != null ? Number(row.sale_price) : null,
      updatedAt: row.updated_at ? String(row.updated_at) : null,
    };
  }

  const items = products.map((p) => {
    const pid = Number(p.id);
    const prices = storePrices[pid] || {};

    // Find cheapest store
    let cheapestStore: string | null = null;
    let cheapestPrice = Infinity;
    for (const [storeId, data] of Object.entries(prices)) {
      const effective = data.salePrice ?? data.price;
      if (effective != null && effective < cheapestPrice) {
        cheapestPrice = effective;
        cheapestStore = storeId;
      }
    }

    return {
      id: pid,
      name: String(p.canonical_name),
      brand: p.brand as string | null,
      size: p.size as string | null,
      imageUrl: p.image_url as string | null,
      prices,
      cheapestStore,
      cheapestPrice: cheapestPrice === Infinity ? null : cheapestPrice,
      storeCount: Object.keys(prices).length,
    };
  });

  return NextResponse.json({ items });
}
