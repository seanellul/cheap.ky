import { NextResponse } from "next/server";
import { rawSql } from "@/lib/db";

// Cache suggestions for 1 hour
let cache: { data: unknown; ts: number } | null = null;
const CACHE_MS = 60 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return NextResponse.json(cache.data);
  }

  // Top searched categories (by product count with 2+ stores)
  const categories = await rawSql(
    `SELECT
       REPLACE(REPLACE(REPLACE(sp.category_raw, 'Shop / Grocery / ', ''), 'Shop / HBC / ', ''), 'Shop / ', '') AS label,
       COUNT(DISTINCT pm.product_id) AS cnt
     FROM store_products sp
     JOIN product_matches pm ON pm.store_product_id = sp.id
     WHERE sp.category_raw IS NOT NULL
     GROUP BY label
     HAVING COUNT(DISTINCT pm.product_id) >= 5
     ORDER BY cnt DESC
     LIMIT 8`
  );

  // Products with biggest price gaps (interesting to users)
  const trending = await rawSql(
    `SELECT p.canonical_name AS label
     FROM products p
     JOIN product_matches pm ON pm.product_id = p.id
     JOIN store_products sp ON pm.store_product_id = sp.id
     WHERE sp.price IS NOT NULL AND COALESCE(sp.sale_price, sp.price) > 0
     GROUP BY p.id, p.canonical_name
     HAVING COUNT(DISTINCT sp.store_id) >= 3
     ORDER BY MAX(COALESCE(sp.sale_price, sp.price)) - MIN(COALESCE(sp.sale_price, sp.price)) DESC
     LIMIT 6`
  );

  // Common staple keywords people search for
  const staples = [
    "chicken", "milk", "bread", "eggs", "rice",
    "cheese", "butter", "water", "juice", "cereal",
    "pasta", "coffee", "sugar", "flour", "oil",
  ];

  const data = {
    categories: categories.map((r) => String(r.label)),
    trending: trending.map((r) => {
      const name = String(r.label);
      // Extract a short search-friendly term (first 3-4 meaningful words)
      return name.split(/[\s,]+/).slice(0, 4).join(" ");
    }),
    staples,
  };

  cache = { data, ts: Date.now() };
  return NextResponse.json(data);
}
