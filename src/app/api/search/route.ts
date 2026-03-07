import { NextRequest, NextResponse } from "next/server";
import { rawSql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const sort = req.nextUrl.searchParams.get("sort") || "relevance";

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const searchTerm = `%${q}%`;

  // Single efficient query: get matched products with all store prices
  const matched = await rawSql(
    `SELECT
       p.id,
       p.canonical_name,
       p.brand,
       p.size,
       p.image_url,
       MIN(COALESCE(sp.sale_price, sp.price)) AS min_price,
       COUNT(DISTINCT sp.store_id) AS store_count,
       json_agg(json_build_object(
         'store_id', sp.store_id,
         'price', sp.price,
         'sale_price', sp.sale_price,
         'name', sp.name,
         'unit_size', sp.unit_size,
         'unit_type', sp.unit_type
       )) AS store_prices
     FROM products p
     JOIN product_matches pm ON pm.product_id = p.id
     JOIN store_products sp ON pm.store_product_id = sp.id
     WHERE (p.canonical_name ILIKE $1 OR p.brand ILIKE $1)
       AND sp.price IS NOT NULL
     GROUP BY p.id, p.canonical_name, p.brand, p.size, p.image_url
     ORDER BY
       CASE WHEN $2 = 'price_asc' THEN MIN(COALESCE(sp.sale_price, sp.price)) END ASC NULLS LAST,
       CASE WHEN $2 = 'price_desc' THEN MIN(COALESCE(sp.sale_price, sp.price)) END DESC NULLS LAST,
       CASE WHEN $2 = 'stores' THEN COUNT(DISTINCT sp.store_id) END DESC,
       CASE WHEN $2 = 'relevance' OR $2 IS NULL THEN 0 END,
       COUNT(DISTINCT sp.store_id) DESC,
       p.canonical_name ASC
     LIMIT 50`,
    [searchTerm, sort]
  );

  // Also find unmatched store products (single-store items)
  const unmatched = await rawSql(
    `SELECT
       sp.id,
       sp.name,
       sp.brand,
       sp.size,
       sp.image_url,
       sp.store_id,
       sp.price,
       sp.sale_price,
       sp.unit_size,
       sp.unit_type,
       COALESCE(sp.sale_price, sp.price) AS min_price
     FROM store_products sp
     WHERE (sp.name ILIKE $1 OR sp.brand ILIKE $1)
       AND sp.price IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM product_matches pm WHERE pm.store_product_id = sp.id
       )
     ORDER BY
       CASE WHEN $2 = 'price_asc' THEN COALESCE(sp.sale_price, sp.price) END ASC NULLS LAST,
       CASE WHEN $2 = 'price_desc' THEN COALESCE(sp.sale_price, sp.price) END DESC NULLS LAST,
       sp.name ASC
     LIMIT 30`,
    [searchTerm, sort]
  );

  const results = [];

  // Process matched products
  for (const row of matched) {
    const storePricesArr = row.store_prices as Array<{
      store_id: string;
      price: number | null;
      sale_price: number | null;
      name: string;
      unit_size: number | null;
      unit_type: string | null;
    }>;

    const prices: Record<string, { price: number | null; salePrice: number | null; name: string; unitSize: number | null; unitType: string | null }> = {};
    for (const sp of storePricesArr) {
      // json_agg can produce duplicates if multiple matches — take the first per store
      if (!prices[sp.store_id]) {
        prices[sp.store_id] = {
          price: sp.price,
          salePrice: sp.sale_price,
          name: sp.name,
          unitSize: sp.unit_size,
          unitType: sp.unit_type,
        };
      }
    }

    results.push({
      id: Number(row.id),
      name: String(row.canonical_name),
      brand: row.brand as string | null,
      size: row.size as string | null,
      imageUrl: row.image_url as string | null,
      minPrice: row.min_price != null ? Number(row.min_price) : null,
      storeCount: Number(row.store_count),
      prices,
    });
  }

  // Process unmatched store products
  for (const sp of unmatched) {
    results.push({
      id: -Number(sp.id),
      name: String(sp.name),
      brand: sp.brand as string | null,
      size: sp.size as string | null,
      imageUrl: sp.image_url as string | null,
      minPrice: sp.min_price != null ? Number(sp.min_price) : null,
      storeCount: 1,
      prices: {
        [String(sp.store_id)]: {
          price: sp.price != null ? Number(sp.price) : null,
          salePrice: sp.sale_price != null ? Number(sp.sale_price) : null,
          name: String(sp.name),
          unitSize: sp.unit_size != null ? Number(sp.unit_size) : null,
          unitType: sp.unit_type as string | null,
        },
      },
    });
  }

  // If sorting by price, merge and re-sort both lists
  if (sort === "price_asc") {
    results.sort((a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity));
  } else if (sort === "price_desc") {
    results.sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0));
  }

  return NextResponse.json({ results: results.slice(0, 50) });
}
