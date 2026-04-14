import { rawSql } from "@/lib/db";
import { productToSlug } from "@/lib/utils/slug";
export { STORE_META } from "./store-meta";

export interface StoreStats {
  totalProducts: number;
  matchedProducts: number;
  winCount: number;
  winRate: number;
  avgPrice: number;
}

export interface StoreBestProduct {
  id: number;
  name: string;
  size: string | null;
  slug: string;
  storePrice: number;
  nextBestPrice: number;
  savings: number;
  pctSavings: number;
}

export interface StoreCategory {
  name: string;
  count: number;
}

export interface StoreWorstProduct {
  id: number;
  name: string;
  size: string | null;
  slug: string;
  storePrice: number;
  cheapestPrice: number;
  premium: number;
  pctPremium: number;
}

export interface StoreData {
  meta: (typeof STORE_META)[string];
  stats: StoreStats;
  bestProducts: StoreBestProduct[];
  worstProducts: StoreWorstProduct[];
  topCategories: StoreCategory[];
}

const ALL_STORES = ["fosters", "hurleys", "costuless", "pricedright", "kirkmarket"];

export async function getStoreData(storeId: string): Promise<StoreData | null> {
  const meta = STORE_META[storeId];
  if (!meta) return null;

  // Total products at this store
  const [totalRow] = await rawSql(
    `SELECT COUNT(*) as c FROM store_products WHERE store_id = $1`,
    [storeId]
  );

  // Products with UPC matches at other stores
  const [matchedRow] = await rawSql(
    `SELECT COUNT(DISTINCT p.id) as c
     FROM products p
     JOIN product_matches pm ON pm.product_id = p.id AND pm.match_method = 'upc'
     JOIN store_products sp ON pm.store_product_id = sp.id
     WHERE sp.store_id = $1
       AND EXISTS (
         SELECT 1 FROM product_matches pm2
         JOIN store_products sp2 ON pm2.store_product_id = sp2.id
         WHERE pm2.product_id = p.id AND sp2.store_id != $2
       )`,
    [storeId, storeId]
  );

  // Win rate: how often this store is cheapest
  const others = ALL_STORES.filter((s) => s !== storeId);
  const storeCol = `${storeId}_price`;
  const otherCols = others.map((s) => `${s}_price`);

  const [winRow] = await rawSql(
    `WITH matched AS (
      SELECT p.id,
        ${ALL_STORES.map(
          (s) =>
            `MIN(CASE WHEN sp.store_id='${s}' THEN COALESCE(sp.sale_price, sp.price) END) as ${s}_price`
        ).join(",\n        ")}
      FROM products p
      JOIN product_matches pm ON pm.product_id = p.id AND pm.match_method = 'upc'
      JOIN store_products sp ON pm.store_product_id = sp.id
      WHERE COALESCE(sp.sale_price, sp.price) > 0
      GROUP BY p.id
      HAVING COUNT(DISTINCT sp.store_id) >= 2
    )
    SELECT
      SUM(CASE WHEN ${storeCol} IS NOT NULL
        ${otherCols.map((c) => `AND ${storeCol} <= COALESCE(${c}, ${storeCol}+1)`).join(" ")}
      THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN ${storeCol} IS NOT NULL THEN 1 ELSE 0 END) as total
    FROM matched`
  );

  // Average price
  const [avgRow] = await rawSql(
    `SELECT ROUND(AVG(COALESCE(sale_price, price))::numeric, 2) as avg
     FROM store_products
     WHERE store_id = $1 AND COALESCE(sale_price, price) > 0`,
    [storeId]
  );

  // Products where this store beats competition the most
  const bestRows = await rawSql(
    `WITH matched AS (
      SELECT p.id, p.canonical_name, p.size,
        ${ALL_STORES.map(
          (s) =>
            `MIN(CASE WHEN sp.store_id='${s}' THEN COALESCE(sp.sale_price, sp.price) END) as ${s}_price`
        ).join(",\n        ")}
      FROM products p
      JOIN product_matches pm ON pm.product_id = p.id AND pm.match_method = 'upc'
      JOIN store_products sp ON pm.store_product_id = sp.id
      WHERE COALESCE(sp.sale_price, sp.price) > 0
      GROUP BY p.id
      HAVING COUNT(DISTINCT sp.store_id) >= 2
    )
    SELECT id, canonical_name, size,
      ${storeCol} as store_price,
      LEAST(${otherCols.map((c) => `COALESCE(${c}, 999999)`).join(", ")}) as next_best
    FROM matched
    WHERE ${storeCol} IS NOT NULL
      ${otherCols.map((c) => `AND ${storeCol} < COALESCE(${c}, ${storeCol}+1)`).join(" ")}
    ORDER BY (LEAST(${otherCols.map((c) => `COALESCE(${c}, 999999)`).join(", ")}) - ${storeCol}) DESC
    LIMIT 12`
  );

  // Products where this store is most expensive
  const worstRows = await rawSql(
    `WITH matched AS (
      SELECT p.id, p.canonical_name, p.size,
        ${ALL_STORES.map(
          (s) =>
            `MIN(CASE WHEN sp.store_id='${s}' THEN COALESCE(sp.sale_price, sp.price) END) as ${s}_price`
        ).join(",\n        ")}
      FROM products p
      JOIN product_matches pm ON pm.product_id = p.id AND pm.match_method = 'upc'
      JOIN store_products sp ON pm.store_product_id = sp.id
      WHERE COALESCE(sp.sale_price, sp.price) > 0
      GROUP BY p.id
      HAVING COUNT(DISTINCT sp.store_id) >= 2
    )
    SELECT id, canonical_name, size,
      ${storeCol} as store_price,
      LEAST(${otherCols.map((c) => `COALESCE(${c}, 999999)`).join(", ")}) as cheapest
    FROM matched
    WHERE ${storeCol} IS NOT NULL
      AND ${storeCol} > LEAST(${otherCols.map((c) => `COALESCE(${c}, 999999)`).join(", ")})
    ORDER BY (${storeCol} - LEAST(${otherCols.map((c) => `COALESCE(${c}, 999999)`).join(", ")})) DESC
    LIMIT 5`
  );

  // Top categories
  const catRows = await rawSql(
    `SELECT
       REPLACE(REPLACE(REPLACE(category_raw, 'Shop / Grocery / ', ''), 'Shop / HBC / ', ''), 'Shop / ', '') as name,
       COUNT(*) as count
     FROM store_products
     WHERE store_id = $1 AND category_raw IS NOT NULL
     GROUP BY REPLACE(REPLACE(REPLACE(category_raw, 'Shop / Grocery / ', ''), 'Shop / HBC / ', ''), 'Shop / ', '')
     HAVING COUNT(*) >= 3
     ORDER BY count DESC
     LIMIT 15`,
    [storeId]
  );

  return {
    meta,
    stats: {
      totalProducts: Number(totalRow.c),
      matchedProducts: Number(matchedRow.c),
      winCount: Number(winRow.wins ?? 0),
      winRate:
        Number(winRow.total) > 0
          ? Math.round((Number(winRow.wins ?? 0) / Number(winRow.total)) * 1000) / 10
          : 0,
      avgPrice: parseFloat(String(avgRow.avg ?? "0")),
    },
    bestProducts: bestRows.map((r: Record<string, unknown>) => ({
      id: Number(r.id),
      name: String(r.canonical_name),
      size: r.size as string | null,
      slug: productToSlug(String(r.canonical_name), Number(r.id)),
      storePrice: Number(r.store_price),
      nextBestPrice: Number(r.next_best),
      savings: Number(r.next_best) - Number(r.store_price),
      pctSavings:
        Number(r.next_best) > 0
          ? Math.round(
              ((Number(r.next_best) - Number(r.store_price)) / Number(r.next_best)) * 100
            )
          : 0,
    })),
    worstProducts: worstRows.map((r: Record<string, unknown>) => ({
      id: Number(r.id),
      name: String(r.canonical_name),
      size: r.size as string | null,
      slug: productToSlug(String(r.canonical_name), Number(r.id)),
      storePrice: Number(r.store_price),
      cheapestPrice: Number(r.cheapest),
      premium: Number(r.store_price) - Number(r.cheapest),
      pctPremium:
        Number(r.cheapest) > 0
          ? Math.round(
              ((Number(r.store_price) - Number(r.cheapest)) / Number(r.cheapest)) * 100
            )
          : 0,
    })),
    topCategories: catRows.map((r: Record<string, unknown>) => ({
      name: String(r.name),
      count: Number(r.count),
    })),
  };
}
