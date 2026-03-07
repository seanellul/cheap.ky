import { NextResponse } from "next/server";
import { rawSql } from "@/lib/db";

const MATCHED_CTE = `
  matched AS (
    SELECT p.id, p.canonical_name as name, p.brand, p.size, p.image_url,
      MIN(CASE WHEN sp.store_id='fosters' THEN COALESCE(sp.sale_price, sp.price) END) as fosters_price,
      MIN(CASE WHEN sp.store_id='hurleys' THEN COALESCE(sp.sale_price, sp.price) END) as hurleys_price,
      MIN(CASE WHEN sp.store_id='costuless' THEN COALESCE(sp.sale_price, sp.price) END) as costuless_price,
      MIN(CASE WHEN sp.store_id='pricedright' THEN COALESCE(sp.sale_price, sp.price) END) as pricedright_price,
      MIN(COALESCE(sp.sale_price, sp.price)) as best_price,
      MAX(COALESCE(sp.sale_price, sp.price)) as worst_price,
      MAX(COALESCE(sp.sale_price, sp.price)) - MIN(COALESCE(sp.sale_price, sp.price)) as savings,
      COUNT(DISTINCT sp.store_id) as num_stores,
      MAX(CASE WHEN sp.store_id='fosters' THEN sp.category_raw END) as category_raw
    FROM products p
    JOIN product_matches pm ON pm.product_id = p.id AND pm.match_method = 'upc'
    JOIN store_products sp ON pm.store_product_id = sp.id
    WHERE COALESCE(sp.sale_price, sp.price) > 0
    GROUP BY p.id, p.canonical_name, p.brand, p.size, p.image_url
    HAVING COUNT(DISTINCT sp.store_id) >= 2
      AND MIN(COALESCE(sp.sale_price, sp.price)) > 0
      AND MAX(COALESCE(sp.sale_price, sp.price)) / NULLIF(MIN(COALESCE(sp.sale_price, sp.price)), 0) < 5
  )
`;

export async function GET() {
  // 1. Overall stats
  const [overview] = await rawSql(`
    WITH ${MATCHED_CTE}
    SELECT
      COUNT(*) as total_compared,
      ROUND(AVG(fosters_price)::numeric, 2) as avg_fosters,
      ROUND(AVG(hurleys_price)::numeric, 2) as avg_hurleys,
      ROUND(AVG(costuless_price)::numeric, 2) as avg_costuless,
      ROUND(AVG(pricedright_price)::numeric, 2) as avg_pricedright,
      ROUND(AVG(savings)::numeric, 2) as avg_savings,
      ROUND(AVG(savings / worst_price * 100)::numeric, 1) as avg_pct_diff,
      ROUND(SUM(savings)::numeric, 2) as total_potential_savings,
      SUM(CASE WHEN savings / worst_price * 100 > 20 THEN 1 ELSE 0 END) as over_20pct,
      SUM(CASE WHEN savings / worst_price * 100 > 50 THEN 1 ELSE 0 END) as over_50pct
    FROM matched
  `);

  // 2. Store win rates
  const [winRates] = await rawSql(`
    WITH ${MATCHED_CTE}
    SELECT
      SUM(CASE WHEN fosters_price IS NOT NULL AND fosters_price <= COALESCE(hurleys_price, fosters_price+1) AND fosters_price <= COALESCE(costuless_price, fosters_price+1) AND fosters_price <= COALESCE(pricedright_price, fosters_price+1) THEN 1 ELSE 0 END) as fosters,
      SUM(CASE WHEN hurleys_price IS NOT NULL AND hurleys_price < COALESCE(fosters_price, hurleys_price+1) AND hurleys_price <= COALESCE(costuless_price, hurleys_price+1) AND hurleys_price <= COALESCE(pricedright_price, hurleys_price+1) THEN 1 ELSE 0 END) as hurleys,
      SUM(CASE WHEN costuless_price IS NOT NULL AND costuless_price < COALESCE(fosters_price, costuless_price+1) AND costuless_price < COALESCE(hurleys_price, costuless_price+1) AND costuless_price <= COALESCE(pricedright_price, costuless_price+1) THEN 1 ELSE 0 END) as costuless,
      SUM(CASE WHEN pricedright_price IS NOT NULL AND pricedright_price < COALESCE(fosters_price, pricedright_price+1) AND pricedright_price < COALESCE(hurleys_price, pricedright_price+1) AND pricedright_price < COALESCE(costuless_price, pricedright_price+1) THEN 1 ELSE 0 END) as pricedright,
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
    ORDER BY
      CASE
        WHEN savings / worst_price * 100 >= 50 THEN 1
        WHEN savings / worst_price * 100 >= 30 THEN 2
        WHEN savings / worst_price * 100 >= 20 THEN 3
        WHEN savings / worst_price * 100 >= 10 THEN 4
        WHEN savings / worst_price * 100 > 0 THEN 5
        ELSE 6
      END
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
      fosters_price, hurleys_price, costuless_price, pricedright_price,
      best_price, worst_price, savings,
      ROUND((savings / worst_price * 100)::numeric, 0) as pct_diff,
      num_stores
    FROM matched
    ORDER BY savings DESC
    LIMIT 15
  `);

  // 6. Where each store is cheapest
  const storeBests: Record<string, Array<{ name: string; size: string | null; price: number; other_price: number; pct: string }>> = {};
  for (const store of ["fosters", "hurleys", "costuless", "pricedright"]) {
    const col = `${store}_price`;
    const others = ["fosters", "hurleys", "costuless", "pricedright"].filter(s => s !== store);
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
  const allStoreIds = ["fosters", "hurleys", "costuless", "pricedright"];
  const allNotNull = allStoreIds.map(s => `${s}_price IS NOT NULL`).join(' AND ');
  const threeStoreProducts = await rawSql(`
    WITH ${MATCHED_CTE}
    SELECT id, name, size, image_url,
      fosters_price, hurleys_price, costuless_price, pricedright_price,
      best_price, worst_price, savings,
      ROUND((savings / worst_price * 100)::numeric, 0) as pct_diff
    FROM matched
    WHERE ${allNotNull}
    ORDER BY savings DESC
    LIMIT 10
  `);

  // 10. Purchasing power
  const pairCols: string[] = [];
  for (let i = 0; i < allStoreIds.length; i++) {
    for (let j = i + 1; j < allStoreIds.length; j++) {
      const a = allStoreIds[i], b = allStoreIds[j];
      const prefix = `${a.charAt(0)}${b.charAt(0)}`;
      const cond = `${a}_price IS NOT NULL AND ${b}_price IS NOT NULL`;
      pairCols.push(
        `SUM(CASE WHEN ${cond} THEN ${a}_price ELSE 0 END) as ${prefix}_${a}`,
        `SUM(CASE WHEN ${cond} THEN ${b}_price ELSE 0 END) as ${prefix}_${b}`,
        `COUNT(CASE WHEN ${cond} THEN 1 END) as ${prefix}_count`
      );
    }
  }
  const allCond = allStoreIds.map(s => `${s}_price IS NOT NULL`).join(' AND ');
  for (const s of allStoreIds) {
    pairCols.push(`SUM(CASE WHEN ${allCond} THEN ${s}_price ELSE 0 END) as all_${s}`);
  }
  pairCols.push(`COUNT(CASE WHEN ${allCond} THEN 1 END) as all_count`);

  const [basketTotals] = await rawSql(`
    WITH ${MATCHED_CTE}
    SELECT ${pairCols.join(',\n      ')}
    FROM matched
  `);

  const purchasingPower: Record<string, Record<string, number>> = {};
  for (const s of allStoreIds) {
    purchasingPower[s] = { [s]: 100 };
  }
  for (let i = 0; i < allStoreIds.length; i++) {
    for (let j = i + 1; j < allStoreIds.length; j++) {
      const a = allStoreIds[i], b = allStoreIds[j];
      const prefix = `${a.charAt(0)}${b.charAt(0)}`;
      const totalA = Number(basketTotals[`${prefix}_${a}`]);
      const totalB = Number(basketTotals[`${prefix}_${b}`]);
      if (totalA > 0 && totalB > 0) {
        purchasingPower[a][b] = Math.round(100 * totalB / totalA * 100) / 100;
        purchasingPower[b][a] = Math.round(100 * totalA / totalB * 100) / 100;
      }
    }
  }

  const allThreeBasket = Number(basketTotals.all_count) > 0 ? {
    count: Number(basketTotals.all_count),
    ...Object.fromEntries(allStoreIds.map(s => [s, Number(basketTotals[`all_${s}`])])),
  } : null;

  return NextResponse.json({
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
    allThreeBasket,
  });
}
