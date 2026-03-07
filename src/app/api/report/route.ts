import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "price-comp.db");

// Reusable CTE for UPC-matched products at 2+ stores (excluding crazy outliers)
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
    GROUP BY p.id
    HAVING COUNT(DISTINCT sp.store_id) >= 2
      AND MIN(COALESCE(sp.sale_price, sp.price)) > 0
      AND MAX(COALESCE(sp.sale_price, sp.price)) / NULLIF(MIN(COALESCE(sp.sale_price, sp.price)), 0) < 5
  )
`;

export async function GET() {
  const sqlite = new Database(dbPath, { readonly: true });

  try {
    // 1. Overall stats
    const overview = sqlite.prepare(`
      WITH ${MATCHED_CTE}
      SELECT
        COUNT(*) as total_compared,
        printf('%.2f', AVG(fosters_price)) as avg_fosters,
        printf('%.2f', AVG(hurleys_price)) as avg_hurleys,
        printf('%.2f', AVG(costuless_price)) as avg_costuless,
        printf('%.2f', AVG(pricedright_price)) as avg_pricedright,
        printf('%.2f', AVG(savings)) as avg_savings,
        printf('%.1f', AVG(savings / worst_price * 100)) as avg_pct_diff,
        printf('%.2f', SUM(savings)) as total_potential_savings,
        SUM(CASE WHEN savings / worst_price * 100 > 20 THEN 1 ELSE 0 END) as over_20pct,
        SUM(CASE WHEN savings / worst_price * 100 > 50 THEN 1 ELSE 0 END) as over_50pct
      FROM matched
    `).get() as Record<string, string | number>;

    // 2. Store win rates
    const winRates = sqlite.prepare(`
      WITH ${MATCHED_CTE}
      SELECT
        SUM(CASE WHEN fosters_price IS NOT NULL AND fosters_price <= COALESCE(hurleys_price, fosters_price+1) AND fosters_price <= COALESCE(costuless_price, fosters_price+1) AND fosters_price <= COALESCE(pricedright_price, fosters_price+1) THEN 1 ELSE 0 END) as fosters,
        SUM(CASE WHEN hurleys_price IS NOT NULL AND hurleys_price < COALESCE(fosters_price, hurleys_price+1) AND hurleys_price <= COALESCE(costuless_price, hurleys_price+1) AND hurleys_price <= COALESCE(pricedright_price, hurleys_price+1) THEN 1 ELSE 0 END) as hurleys,
        SUM(CASE WHEN costuless_price IS NOT NULL AND costuless_price < COALESCE(fosters_price, costuless_price+1) AND costuless_price < COALESCE(hurleys_price, costuless_price+1) AND costuless_price <= COALESCE(pricedright_price, costuless_price+1) THEN 1 ELSE 0 END) as costuless,
        SUM(CASE WHEN pricedright_price IS NOT NULL AND pricedright_price < COALESCE(fosters_price, pricedright_price+1) AND pricedright_price < COALESCE(hurleys_price, pricedright_price+1) AND pricedright_price < COALESCE(costuless_price, pricedright_price+1) THEN 1 ELSE 0 END) as pricedright,
        COUNT(*) as total
      FROM matched
    `).get() as Record<string, number>;

    // 3. Price difference distribution
    const distribution = sqlite.prepare(`
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
      GROUP BY bucket
      ORDER BY
        CASE bucket
          WHEN '50%+' THEN 1 WHEN '30-50%' THEN 2 WHEN '20-30%' THEN 3
          WHEN '10-20%' THEN 4 WHEN '1-10%' THEN 5 ELSE 6
        END
    `).all() as Array<{ bucket: string; count: number }>;

    // 4. Category insights (top categories by avg % diff)
    const categoryInsights = sqlite.prepare(`
      WITH ${MATCHED_CTE}
      SELECT
        REPLACE(REPLACE(REPLACE(category_raw, 'Shop / Grocery / ', ''), 'Shop / HBC / ', ''), 'Shop / ', '') as category,
        COUNT(*) as product_count,
        printf('%.1f', AVG(savings / worst_price * 100)) as avg_pct_diff,
        printf('%.2f', AVG(savings)) as avg_savings_per_item,
        printf('%.2f', SUM(savings)) as total_savings
      FROM matched
      WHERE category_raw IS NOT NULL
      GROUP BY category
      HAVING COUNT(*) >= 8
      ORDER BY AVG(savings / worst_price * 100) DESC
      LIMIT 20
    `).all() as Array<{
      category: string;
      product_count: number;
      avg_pct_diff: string;
      avg_savings_per_item: string;
      total_savings: string;
    }>;

    // 5. Biggest price gaps (top 15 individual products)
    const biggestGaps = sqlite.prepare(`
      WITH ${MATCHED_CTE}
      SELECT id, name, brand, size, image_url,
        fosters_price, hurleys_price, costuless_price, pricedright_price,
        best_price, worst_price, savings,
        printf('%.0f', savings / worst_price * 100) as pct_diff,
        num_stores
      FROM matched
      ORDER BY savings DESC
      LIMIT 15
    `).all() as Array<{
      id: number; name: string; brand: string | null; size: string | null; image_url: string | null;
      fosters_price: number | null; hurleys_price: number | null; costuless_price: number | null;
      best_price: number; worst_price: number; savings: number; pct_diff: string; num_stores: number;
    }>;

    // 6. Where each store is cheapest (best examples)
    const storeBests: Record<string, Array<{ name: string; size: string | null; price: number; other_price: number; pct: string }>> = {};
    for (const store of ["fosters", "hurleys", "costuless", "pricedright"]) {
      const col = `${store}_price`;
      const others = ["fosters", "hurleys", "costuless", "pricedright"].filter(s => s !== store);
      const otherCols = others.map(s => `${s}_price`);

      storeBests[store] = sqlite.prepare(`
        WITH ${MATCHED_CTE}
        SELECT name, size, ${col} as price,
          MIN(${otherCols.map(c => `COALESCE(${c}, 999999)`).join(', ')}) as other_price,
          printf('%.0f', (MIN(${otherCols.map(c => `COALESCE(${c}, 999999)`).join(', ')}) - ${col}) / MIN(${otherCols.map(c => `COALESCE(${c}, 999999)`).join(', ')}) * 100) as pct
        FROM matched
        WHERE ${col} IS NOT NULL
          ${otherCols.map(c => `AND ${col} < COALESCE(${c}, ${col}+1)`).join('\n          ')}
        ORDER BY (MIN(${otherCols.map(c => `COALESCE(${c}, 999999)`).join(', ')}) - ${col}) DESC
        LIMIT 8
      `).all() as Array<{ name: string; size: string | null; price: number; other_price: number; pct: string }>;
    }

    // 7. Head-to-head: Foster's vs Hurley's (the biggest matchup)
    const headToHead = sqlite.prepare(`
      WITH ${MATCHED_CTE}
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN fosters_price < hurleys_price THEN 1 ELSE 0 END) as fosters_cheaper,
        SUM(CASE WHEN hurleys_price < fosters_price THEN 1 ELSE 0 END) as hurleys_cheaper,
        SUM(CASE WHEN fosters_price = hurleys_price THEN 1 ELSE 0 END) as same_price,
        printf('%.2f', AVG(fosters_price)) as avg_fosters,
        printf('%.2f', AVG(hurleys_price)) as avg_hurleys,
        printf('%.2f', SUM(ABS(fosters_price - hurleys_price))) as total_diff
      FROM matched
      WHERE fosters_price IS NOT NULL AND hurleys_price IS NOT NULL
    `).get() as Record<string, string | number>;

    // 8. Store product counts
    const storeCounts = sqlite.prepare(`
      SELECT store_id, COUNT(*) as count FROM store_products GROUP BY store_id ORDER BY count DESC
    `).all() as Array<{ store_id: string; count: number }>;

    // 9. Products at all 4 stores (or as many as possible)
    const allStoreIds = ["fosters", "hurleys", "costuless", "pricedright"];
    const allNotNull = allStoreIds.map(s => `${s}_price IS NOT NULL`).join(' AND ');
    const threeStoreProducts = sqlite.prepare(`
      WITH ${MATCHED_CTE}
      SELECT id, name, size, image_url,
        fosters_price, hurleys_price, costuless_price, pricedright_price,
        best_price, worst_price, savings,
        printf('%.0f', savings / worst_price * 100) as pct_diff
      FROM matched
      WHERE ${allNotNull}
      ORDER BY savings DESC
      LIMIT 10
    `).all() as Array<{
      id: number; name: string; size: string | null; image_url: string | null;
      fosters_price: number; hurleys_price: number; costuless_price: number; pricedright_price: number;
      best_price: number; worst_price: number; savings: number; pct_diff: string;
    }>;

    // 10. Purchasing power: $100 equivalence across stores (pairwise)
    // Build pairwise sums dynamically
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
    // Also add all-stores basket
    const allCond = allStoreIds.map(s => `${s}_price IS NOT NULL`).join(' AND ');
    for (const s of allStoreIds) {
      pairCols.push(`SUM(CASE WHEN ${allCond} THEN ${s}_price ELSE 0 END) as all_${s}`);
    }
    pairCols.push(`COUNT(CASE WHEN ${allCond} THEN 1 END) as all_count`);

    const basketTotals = sqlite.prepare(`
      WITH ${MATCHED_CTE}
      SELECT ${pairCols.join(',\n        ')}
      FROM matched
    `).get() as Record<string, number>;

    // Compute: what does $100 at each store buy you at the others?
    const purchasingPower: Record<string, Record<string, number>> = {};
    for (const s of allStoreIds) {
      purchasingPower[s] = { [s]: 100 };
    }
    for (let i = 0; i < allStoreIds.length; i++) {
      for (let j = i + 1; j < allStoreIds.length; j++) {
        const a = allStoreIds[i], b = allStoreIds[j];
        const prefix = `${a.charAt(0)}${b.charAt(0)}`;
        const totalA = basketTotals[`${prefix}_${a}`];
        const totalB = basketTotals[`${prefix}_${b}`];
        if (totalA > 0 && totalB > 0) {
          purchasingPower[a][b] = Math.round(100 * totalB / totalA * 100) / 100;
          purchasingPower[b][a] = Math.round(100 * totalA / totalB * 100) / 100;
        }
      }
    }

    // All-stores comparison (most apples-to-apples)
    const allThreeBasket = basketTotals.all_count > 0 ? {
      count: basketTotals.all_count,
      ...Object.fromEntries(allStoreIds.map(s => [s, basketTotals[`all_${s}`]])),
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
  } finally {
    sqlite.close();
  }
}
