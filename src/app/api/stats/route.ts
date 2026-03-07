import { NextResponse } from "next/server";
import { rawSql } from "@/lib/db";

let cache: { data: unknown; ts: number } | null = null;
const CACHE_MS = 60 * 60 * 1000; // 1 hour

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return NextResponse.json(cache.data);
  }

  const [productRow, storeRow, matchRow, savingsRow] = await Promise.all([
    rawSql("SELECT COUNT(*) AS count FROM products"),
    rawSql("SELECT COUNT(*) AS count FROM stores WHERE active = true"),
    rawSql("SELECT COUNT(*) AS count FROM product_matches"),
    rawSql(`
      WITH prices AS (
        SELECT
          pm.product_id,
          MIN(COALESCE(sp.sale_price, sp.price)) AS cheapest,
          MAX(COALESCE(sp.sale_price, sp.price)) AS priciest
        FROM product_matches pm
        JOIN store_products sp ON sp.id = pm.store_product_id
        WHERE sp.price IS NOT NULL
        GROUP BY pm.product_id
        HAVING COUNT(DISTINCT sp.store_id) >= 2
      )
      SELECT
        ROUND(AVG(100.0 * (priciest - cheapest) / NULLIF(priciest, 0))::numeric, 0) AS avg_savings_pct,
        ROUND(MAX(priciest - cheapest)::numeric, 2) AS max_savings_kyd
      FROM prices
      WHERE priciest > cheapest
    `),
  ]);

  const data = {
    products: Number(productRow[0]?.count ?? 0),
    stores: Number(storeRow[0]?.count ?? 0),
    matches: Number(matchRow[0]?.count ?? 0),
    avgSavingsPct: Number(savingsRow[0]?.avg_savings_pct ?? 0),
    maxSavingsKyd: Number(savingsRow[0]?.max_savings_kyd ?? 0),
  };

  cache = { data, ts: Date.now() };
  return NextResponse.json(data);
}
