import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { rawSql } from "@/lib/db";

/** Postgres returns bigint/numeric as strings — coerce to JS numbers */
function numify<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(numify) as unknown as T;
  if (typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = numify(v);
    }
    return out as T;
  }
  if (typeof obj === "string" && obj !== "" && !isNaN(Number(obj))) {
    return Number(obj) as unknown as T;
  }
  return obj;
}

const ALL_STORES = ["fosters", "hurleys", "costuless", "pricedright", "shopright"] as const;

const MATCHED_CTE = `
  matched AS (
    SELECT p.id, p.canonical_name as name, p.brand, p.size, p.image_url,
      ${ALL_STORES.map(s => `MIN(CASE WHEN sp.store_id='${s}' THEN COALESCE(sp.sale_price, sp.price) END) as ${s}_price`).join(',\n      ')},
      MIN(COALESCE(sp.sale_price, sp.price)) as best_price,
      MAX(COALESCE(sp.sale_price, sp.price)) as worst_price,
      MAX(COALESCE(sp.sale_price, sp.price)) - MIN(COALESCE(sp.sale_price, sp.price)) as savings,
      COUNT(DISTINCT sp.store_id) as num_stores,
      MAX(CASE WHEN sp.store_id='fosters' THEN sp.category_raw END) as category_raw
    FROM products p
    JOIN product_matches pm ON pm.product_id = p.id
    JOIN store_products sp ON pm.store_product_id = sp.id
    WHERE COALESCE(sp.sale_price, sp.price) > 0
    GROUP BY p.id, p.canonical_name, p.brand, p.size, p.image_url
    HAVING COUNT(DISTINCT sp.store_id) >= 2
      AND MIN(COALESCE(sp.sale_price, sp.price)) > 0
      AND MAX(COALESCE(sp.sale_price, sp.price)) / NULLIF(MIN(COALESCE(sp.sale_price, sp.price)), 0) < 5
  )
`;

const getReportData = unstable_cache(
  async () => {
    return await _fetchReportData();
  },
  ["report-data"],
  { revalidate: 10800 } // 3 hours
);

async function _fetchReportData() {
  // 1. Overall stats
  const [overview] = await rawSql(`
    WITH ${MATCHED_CTE}
    SELECT
      COUNT(*) as total_compared,
      ${ALL_STORES.map(s => `ROUND(AVG(${s}_price)::numeric, 2) as avg_${s}`).join(',\n      ')},
      ROUND(AVG(savings)::numeric, 2) as avg_savings,
      ROUND(AVG(savings / worst_price * 100)::numeric, 1) as avg_pct_diff,
      ROUND(SUM(savings)::numeric, 2) as total_potential_savings,
      SUM(CASE WHEN savings / worst_price * 100 > 20 THEN 1 ELSE 0 END) as over_20pct,
      SUM(CASE WHEN savings / worst_price * 100 > 50 THEN 1 ELSE 0 END) as over_50pct
    FROM matched
  `);

  // 2. Store win rates — a store "wins" if its price equals the best_price
  const winCases = ALL_STORES.map(s =>
    `SUM(CASE WHEN ${s}_price IS NOT NULL AND ${s}_price = best_price THEN 1 ELSE 0 END) as ${s}`
  ).join(',\n      ');
  const [winRates] = await rawSql(`
    WITH ${MATCHED_CTE}
    SELECT
      ${winCases},
      COUNT(*) as total
    FROM matched
  `);

  // 3. Price difference distribution
  const distribution = await rawSql(`
    WITH ${MATCHED_CTE}
    SELECT
      CASE
        WHEN savings / worst_price * 100 >= 50 THEN '50%+'
        WHEN savings / worst_price * 100 >= 30 THEN '30-50%'
        WHEN savings / worst_price * 100 >= 20 THEN '20-30%'
        WHEN savings / worst_price * 100 >= 10 THEN '10-20%'
        WHEN savings / worst_price * 100 > 0 THEN '1-10%'
        ELSE 'Same price'
      END as bucket,
      COUNT(*) as count
    FROM matched
    GROUP BY
      CASE
        WHEN savings / worst_price * 100 >= 50 THEN '50%+'
        WHEN savings / worst_price * 100 >= 30 THEN '30-50%'
        WHEN savings / worst_price * 100 >= 20 THEN '20-30%'
        WHEN savings / worst_price * 100 >= 10 THEN '10-20%'
        WHEN savings / worst_price * 100 > 0 THEN '1-10%'
        ELSE 'Same price'
      END
    ORDER BY MIN(
      CASE
        WHEN savings / worst_price * 100 >= 50 THEN 1
        WHEN savings / worst_price * 100 >= 30 THEN 2
        WHEN savings / worst_price * 100 >= 20 THEN 3
        WHEN savings / worst_price * 100 >= 10 THEN 4
        WHEN savings / worst_price * 100 > 0 THEN 5
        ELSE 6
      END)
  `);

  // 4. Category insights
  const categoryInsights = await rawSql(`
    WITH ${MATCHED_CTE}
    SELECT
      REPLACE(REPLACE(REPLACE(category_raw, 'Shop / Grocery / ', ''), 'Shop / HBC / ', ''), 'Shop / ', '') as category,
      COUNT(*) as product_count,
      ROUND(AVG(savings / worst_price * 100)::numeric, 1) as avg_pct_diff,
      ROUND(AVG(savings)::numeric, 2) as avg_savings_per_item,
      ROUND(SUM(savings)::numeric, 2) as total_savings
    FROM matched
    WHERE category_raw IS NOT NULL
    GROUP BY REPLACE(REPLACE(REPLACE(category_raw, 'Shop / Grocery / ', ''), 'Shop / HBC / ', ''), 'Shop / ', '')
    HAVING COUNT(*) >= 8
    ORDER BY AVG(savings / worst_price * 100) DESC
    LIMIT 20
  `);

  // 5. Biggest price gaps
  const biggestGaps = await rawSql(`
    WITH ${MATCHED_CTE}
    SELECT id, name, brand, size, image_url,
      ${ALL_STORES.map(s => `${s}_price`).join(', ')},
      best_price, worst_price, savings,
      ROUND((savings / worst_price * 100)::numeric, 0) as pct_diff,
      num_stores
    FROM matched
    ORDER BY savings DESC
    LIMIT 15
  `);

  // 6. Where each store is cheapest
  const storeBests: Record<string, Array<{ name: string; size: string | null; price: number; other_price: number; pct: string }>> = {};
  for (const store of ALL_STORES) {
    const col = `${store}_price`;
    const others = ALL_STORES.filter(s => s !== store);
    const otherCols = others.map(s => `${s}_price`);

    storeBests[store] = (await rawSql(`
      WITH ${MATCHED_CTE}
      SELECT name, size, ${col} as price,
        LEAST(${otherCols.map(c => `COALESCE(${c}, 999999)`).join(', ')}) as other_price,
        ROUND(((LEAST(${otherCols.map(c => `COALESCE(${c}, 999999)`).join(', ')}) - ${col}) / LEAST(${otherCols.map(c => `COALESCE(${c}, 999999)`).join(', ')}) * 100)::numeric, 0) as pct
      FROM matched
      WHERE ${col} IS NOT NULL
        ${otherCols.map(c => `AND ${col} < COALESCE(${c}, ${col}+1)`).join('\n        ')}
      ORDER BY (LEAST(${otherCols.map(c => `COALESCE(${c}, 999999)`).join(', ')}) - ${col}) DESC
      LIMIT 8
    `)) as unknown as Array<{ name: string; size: string | null; price: number; other_price: number; pct: string }>;
  }

  // 7. Head-to-head: Foster's vs Hurley's
  const [headToHead] = await rawSql(`
    WITH ${MATCHED_CTE}
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN fosters_price < hurleys_price THEN 1 ELSE 0 END) as fosters_cheaper,
      SUM(CASE WHEN hurleys_price < fosters_price THEN 1 ELSE 0 END) as hurleys_cheaper,
      SUM(CASE WHEN fosters_price = hurleys_price THEN 1 ELSE 0 END) as same_price,
      ROUND(AVG(fosters_price)::numeric, 2) as avg_fosters,
      ROUND(AVG(hurleys_price)::numeric, 2) as avg_hurleys,
      ROUND(SUM(ABS(fosters_price - hurleys_price))::numeric, 2) as total_diff
    FROM matched
    WHERE fosters_price IS NOT NULL AND hurleys_price IS NOT NULL
  `);

  // 8. Store product counts
  const storeCounts = await rawSql(
    `SELECT store_id, COUNT(*) as count FROM store_products GROUP BY store_id ORDER BY count DESC`
  );

  // 9. Products at all stores
  const allStoreIds = [...ALL_STORES];
  const allNotNull = allStoreIds.map(s => `${s}_price IS NOT NULL`).join(' AND ');
  const threeStoreProducts = await rawSql(`
    WITH ${MATCHED_CTE}
    SELECT id, name, size, image_url,
      ${ALL_STORES.map(s => `${s}_price`).join(', ')},
      best_price, worst_price, savings,
      ROUND((savings / worst_price * 100)::numeric, 0) as pct_diff
    FROM matched
    WHERE ${allNotNull}
    ORDER BY savings DESC
    LIMIT 10
  `);

  // 10. Purchasing power — per-product average price index (each product weighted equally)
  // For each store, avg(store_price / best_price) gives a price index (1.0 = always cheapest)
  const indexCols = allStoreIds.map(s =>
    `ROUND(AVG(CASE WHEN ${s}_price IS NOT NULL THEN ${s}_price / best_price END)::numeric, 4) as ${s}_idx`
  );
  const countCols = allStoreIds.map(s => `COUNT(${s}_price) as ${s}_count`);
  const [priceIndex] = await rawSql(`
    WITH ${MATCHED_CTE}
    SELECT COUNT(*) as total_products,
      ${indexCols.join(',\n      ')},
      ${countCols.join(',\n      ')}
    FROM matched
  `);

  // Pairwise conversion: avg(B_price / A_price) for shared products
  const pairRatios: string[] = [];
  for (let i = 0; i < allStoreIds.length; i++) {
    for (let j = i + 1; j < allStoreIds.length; j++) {
      const a = allStoreIds[i], b = allStoreIds[j];
      const cond = `${a}_price IS NOT NULL AND ${b}_price IS NOT NULL AND ${a}_price > 0`;
      pairRatios.push(
        `ROUND(AVG(CASE WHEN ${cond} THEN ${b}_price / ${a}_price END)::numeric, 4) as r_${a}_${b}`,
        `ROUND(AVG(CASE WHEN ${cond} THEN ${a}_price / ${b}_price END)::numeric, 4) as r_${b}_${a}`,
        `COUNT(CASE WHEN ${cond} THEN 1 END) as n_${a}_${b}`
      );
    }
  }
  const [ratios] = await rawSql(`
    WITH ${MATCHED_CTE}
    SELECT ${pairRatios.join(',\n      ')}
    FROM matched
  `);

  const purchasingPower: Record<string, Record<string, number>> = {};
  for (const s of allStoreIds) {
    purchasingPower[s] = { [s]: 100 };
  }
  for (let i = 0; i < allStoreIds.length; i++) {
    for (let j = i + 1; j < allStoreIds.length; j++) {
      const a = allStoreIds[i], b = allStoreIds[j];
      const rAtoB = Number(ratios[`r_${a}_${b}`]);
      const rBtoA = Number(ratios[`r_${b}_${a}`]);
      if (rAtoB > 0) purchasingPower[a][b] = Math.round(100 * rAtoB * 100) / 100;
      if (rBtoA > 0) purchasingPower[b][a] = Math.round(100 * rBtoA * 100) / 100;
    }
  }

  // Build the store price index for the $100 comparison
  const storeIndex: Record<string, { index: number; count: number }> = {};
  for (const s of allStoreIds) {
    const idx = Number(priceIndex[`${s}_idx`]);
    const cnt = Number(priceIndex[`${s}_count`]);
    if (idx > 0 && cnt > 0) storeIndex[s] = { index: idx, count: cnt };
  }
  const totalProducts = Number(priceIndex.total_products);

  return numify({
    overview,
    winRates,
    distribution,
    categoryInsights,
    biggestGaps,
    storeBests,
    headToHead,
    storeCounts,
    threeStoreProducts,
    purchasingPower,
    storeIndex,
    totalProducts,
  });
}

export async function GET() {
  try {
    const data = await getReportData();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=10800, stale-while-revalidate=86400" },
    });
  } catch (e: unknown) {
    console.error("[report] Error:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
