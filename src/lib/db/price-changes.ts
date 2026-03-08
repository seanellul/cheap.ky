import { rawSql } from "@/lib/db";

export interface PriceChange {
  direction: "up" | "down";
  amount: number;
}

export async function getPriceChanges(
  storeProductIds: number[]
): Promise<Map<number, PriceChange>> {
  if (storeProductIds.length === 0) return new Map();

  const placeholders = storeProductIds.map((_, i) => `$${i + 1}`).join(",");

  const rows = await rawSql(
    `WITH ranked AS (
      SELECT
        store_product_id,
        COALESCE(sale_price, price) AS effective_price,
        ROW_NUMBER() OVER (PARTITION BY store_product_id ORDER BY recorded_at DESC) AS rn
      FROM price_history
      WHERE store_product_id IN (${placeholders})
        AND COALESCE(sale_price, price) IS NOT NULL
    )
    SELECT
      cur.store_product_id,
      cur.effective_price AS current_price,
      prev.effective_price AS previous_price
    FROM ranked cur
    JOIN ranked prev ON cur.store_product_id = prev.store_product_id AND prev.rn = 2
    WHERE cur.rn = 1
      AND cur.effective_price != prev.effective_price`,
    storeProductIds
  );

  const result = new Map<number, PriceChange>();

  for (const row of rows) {
    const spId = Number(row.store_product_id);
    const current = Number(row.current_price);
    const previous = Number(row.previous_price);
    const diff = current - previous;

    result.set(spId, {
      direction: diff > 0 ? "up" : "down",
      amount: Math.abs(diff),
    });
  }

  return result;
}
