import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { rawSql } from "@/lib/db";

const getStatsData = unstable_cache(
  async () => {
    const [productRow, storeRow, matchRow] = await Promise.all([
      rawSql("SELECT COUNT(*) AS count FROM products"),
      rawSql("SELECT COUNT(*) AS count FROM stores WHERE active = true"),
      rawSql("SELECT COUNT(*) AS count FROM product_matches"),
    ]);

    let avgSavingsPct = 0;
    let maxSavingsKyd = 0;
    try {
      const savingsRow = await rawSql(`
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
          ROUND(AVG(100.0 * (priciest - cheapest) / NULLIF(priciest, 0)), 0) AS avg_savings_pct,
          ROUND(MAX(priciest - cheapest), 2) AS max_savings_kyd
        FROM prices
        WHERE priciest > cheapest
      `);
      avgSavingsPct = Number(savingsRow[0]?.avg_savings_pct ?? 0);
      maxSavingsKyd = Number(savingsRow[0]?.max_savings_kyd ?? 0);
    } catch {
      // savings query is optional
    }

    return {
      products: Number(productRow[0]?.count ?? 0),
      stores: Number(storeRow[0]?.count ?? 0),
      matches: Number(matchRow[0]?.count ?? 0),
      avgSavingsPct,
      maxSavingsKyd,
    };
  },
  ["stats-data"],
  { revalidate: 3600 }
);

export async function GET() {
  const data = await getStatsData();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
