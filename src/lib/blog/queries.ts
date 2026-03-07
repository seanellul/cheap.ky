import { taggedSql } from "@/lib/db";
import { productToSlug } from "@/lib/utils/slug";
import type {
  PriceGap,
  StoreSummary,
  CategoryBreakdown,
  PriceDrop,
  WeeklyReportData,
  StoreComparisonData,
  CategorySpotlightData,
} from "./types";

const STORE_NAMES: Record<string, string> = {
  fosters: "Foster's",
  hurleys: "Hurley's",
  kirkmarket: "Kirk Market",
  costuless: "Cost-U-Less",
  pricedright: "Priced Right",
};

const STORE_IDS = Object.keys(STORE_NAMES);

// ── Store Summaries ───────────────────────────────────────────────────

export async function getStoreSummaries(): Promise<StoreSummary[]> {
  const rows = await taggedSql`
    WITH matched AS (
      SELECT
        sp.store_id,
        sp.id AS sp_id,
        COALESCE(sp.sale_price, sp.price) AS effective,
        pm.product_id
      FROM store_products sp
      JOIN product_matches pm ON pm.store_product_id = sp.id
      WHERE sp.price IS NOT NULL
    ),
    product_cheapest AS (
      SELECT product_id, MIN(effective) AS min_price
      FROM matched
      GROUP BY product_id
      HAVING COUNT(DISTINCT store_id) >= 2
    )
    SELECT
      m.store_id,
      COUNT(DISTINCT m.sp_id) AS total_products,
      COUNT(DISTINCT m.product_id) AS matched_products,
      ROUND(AVG(m.effective)::numeric, 2) AS avg_price,
      ROUND(
        100.0 * COUNT(DISTINCT CASE WHEN m.effective = pc.min_price THEN m.product_id END)
        / NULLIF(COUNT(DISTINCT CASE WHEN pc.product_id IS NOT NULL THEN m.product_id END), 0)
      , 1) AS win_rate
    FROM matched m
    LEFT JOIN product_cheapest pc ON pc.product_id = m.product_id
    GROUP BY m.store_id
  `;

  return rows.map((r: any) => ({
    storeId: r.store_id,
    storeName: STORE_NAMES[r.store_id] ?? r.store_id,
    totalProducts: Number(r.total_products),
    matchedProducts: Number(r.matched_products),
    avgPrice: Number(r.avg_price),
    winRate: Number(r.win_rate),
  }));
}

// ── Top Price Gaps ────────────────────────────────────────────────────

export async function getTopPriceGaps(limit = 25): Promise<PriceGap[]> {
  const rows = await taggedSql`
    WITH prices AS (
      SELECT
        p.id AS product_id,
        p.canonical_name,
        sp.store_id,
        COALESCE(sp.sale_price, sp.price) AS effective
      FROM products p
      JOIN product_matches pm ON pm.product_id = p.id
      JOIN store_products sp ON sp.id = pm.store_product_id
      WHERE sp.price IS NOT NULL
    ),
    extremes AS (
      SELECT
        product_id,
        canonical_name,
        MIN(effective) AS min_price,
        MAX(effective) AS max_price,
        (SELECT store_id FROM prices p2 WHERE p2.product_id = prices.product_id ORDER BY effective ASC LIMIT 1) AS cheap_store,
        (SELECT store_id FROM prices p2 WHERE p2.product_id = prices.product_id ORDER BY effective DESC LIMIT 1) AS expensive_store
      FROM prices
      GROUP BY product_id, canonical_name
      HAVING COUNT(DISTINCT store_id) >= 2 AND MAX(effective) - MIN(effective) > 0.01
    )
    SELECT * FROM extremes
    ORDER BY (max_price - min_price) DESC
    LIMIT ${limit}
  `;

  return rows.map((r: any) => ({
    productName: r.canonical_name,
    productSlug: productToSlug(r.canonical_name, r.product_id),
    cheapestStore: STORE_NAMES[r.cheap_store] ?? r.cheap_store,
    cheapestPrice: Number(r.min_price),
    expensiveStore: STORE_NAMES[r.expensive_store] ?? r.expensive_store,
    expensivePrice: Number(r.max_price),
    savings: Number(r.max_price) - Number(r.min_price),
    pctDiff: Math.round(((Number(r.max_price) - Number(r.min_price)) / Number(r.max_price)) * 100),
  }));
}

// ── Price Drops ───────────────────────────────────────────────────────

export async function getPriceDrops(sinceDays = 7, limit = 20): Promise<PriceDrop[]> {
  const rows = await taggedSql`
    WITH recent AS (
      SELECT
        ph.store_product_id,
        COALESCE(ph.sale_price, ph.price) AS current_price,
        ph.recorded_at
      FROM price_history ph
      WHERE ph.recorded_at >= NOW() - INTERVAL '1 day'
        AND ph.price IS NOT NULL
    ),
    previous AS (
      SELECT DISTINCT ON (ph.store_product_id)
        ph.store_product_id,
        COALESCE(ph.sale_price, ph.price) AS old_price
      FROM price_history ph
      WHERE ph.recorded_at < NOW() - INTERVAL '1 day'
        AND ph.recorded_at >= NOW() - MAKE_INTERVAL(days => ${sinceDays})
        AND ph.price IS NOT NULL
      ORDER BY ph.store_product_id, ph.recorded_at DESC
    )
    SELECT
      p.id AS product_id,
      p.canonical_name,
      sp.store_id,
      prev.old_price,
      rec.current_price
    FROM recent rec
    JOIN previous prev ON prev.store_product_id = rec.store_product_id
    JOIN store_products sp ON sp.id = rec.store_product_id
    JOIN product_matches pm ON pm.store_product_id = sp.id
    JOIN products p ON p.id = pm.product_id
    WHERE prev.old_price > rec.current_price
    ORDER BY (prev.old_price - rec.current_price) DESC
    LIMIT ${limit}
  `;

  return rows.map((r: any) => {
    const oldPrice = Number(r.old_price);
    const newPrice = Number(r.current_price);
    return {
      productName: r.canonical_name,
      productSlug: productToSlug(r.canonical_name, r.product_id),
      storeName: STORE_NAMES[r.store_id] ?? r.store_id,
      oldPrice,
      newPrice,
      dropAmount: oldPrice - newPrice,
      dropPct: Math.round(((oldPrice - newPrice) / oldPrice) * 100),
    };
  });
}

// ── Category Breakdowns ───────────────────────────────────────────────

export async function getCategoryBreakdowns(limit = 15): Promise<CategoryBreakdown[]> {
  const rows = await taggedSql`
    WITH cat_prices AS (
      SELECT
        SPLIT_PART(sp.category_raw, ' / ', 1) AS top_category,
        sp.store_id,
        COALESCE(sp.sale_price, sp.price) AS effective,
        pm.product_id
      FROM store_products sp
      JOIN product_matches pm ON pm.store_product_id = sp.id
      WHERE sp.price IS NOT NULL AND sp.category_raw IS NOT NULL
    ),
    cat_stats AS (
      SELECT
        top_category,
        COUNT(DISTINCT product_id) AS product_count,
        ROUND((MAX(effective) - MIN(effective))::numeric, 2) AS avg_savings,
        (
          SELECT store_id
          FROM cat_prices cp2
          WHERE cp2.top_category = cat_prices.top_category
          GROUP BY store_id
          ORDER BY AVG(effective) ASC
          LIMIT 1
        ) AS cheapest_store
      FROM cat_prices
      GROUP BY top_category
      HAVING COUNT(DISTINCT store_id) >= 2 AND COUNT(DISTINCT product_id) >= 5
    )
    SELECT * FROM cat_stats
    ORDER BY avg_savings DESC
    LIMIT ${limit}
  `;

  return rows.map((r: any) => ({
    category: r.top_category,
    categorySlug: r.top_category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    productCount: Number(r.product_count),
    cheapestStore: STORE_NAMES[r.cheapest_store] ?? r.cheapest_store,
    avgSavings: Number(r.avg_savings),
  }));
}

// ── Composite: Weekly Report Data ─────────────────────────────────────

export async function getWeeklyReportData(): Promise<WeeklyReportData> {
  const [storeSummaries, topGaps, priceDrops, categoryBreakdowns] = await Promise.all([
    getStoreSummaries(),
    getTopPriceGaps(20),
    getPriceDrops(7, 15),
    getCategoryBreakdowns(10),
  ]);

  const totalRow = await taggedSql`
    SELECT
      COUNT(DISTINCT sp.id) AS total,
      COUNT(DISTINCT pm.product_id) AS matched
    FROM store_products sp
    LEFT JOIN product_matches pm ON pm.store_product_id = sp.id
    WHERE sp.price IS NOT NULL
  `;

  const now = new Date();
  const weekOf = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return {
    weekOf,
    totalProducts: Number(totalRow[0]?.total ?? 0),
    totalMatched: Number(totalRow[0]?.matched ?? 0),
    topGaps,
    storeSummaries,
    priceDrops,
    categoryBreakdowns,
  };
}

// ── Store vs Store Data ───────────────────────────────────────────────

export async function getStoreComparisonData(
  storeIdA: string,
  storeIdB: string
): Promise<StoreComparisonData> {
  const summaries = await getStoreSummaries();
  const storeA = summaries.find((s) => s.storeId === storeIdA)!;
  const storeB = summaries.find((s) => s.storeId === storeIdB)!;

  const rows = await taggedSql`
    WITH a_prices AS (
      SELECT pm.product_id, p.canonical_name, p.id,
             COALESCE(sp.sale_price, sp.price) AS price_a
      FROM store_products sp
      JOIN product_matches pm ON pm.store_product_id = sp.id
      JOIN products p ON p.id = pm.product_id
      WHERE sp.store_id = ${storeIdA} AND sp.price IS NOT NULL
    ),
    b_prices AS (
      SELECT pm.product_id,
             COALESCE(sp.sale_price, sp.price) AS price_b
      FROM store_products sp
      JOIN product_matches pm ON pm.store_product_id = sp.id
      WHERE sp.store_id = ${storeIdB} AND sp.price IS NOT NULL
    )
    SELECT
      a.id AS product_id,
      a.canonical_name,
      a.price_a,
      b.price_b
    FROM a_prices a
    JOIN b_prices b ON b.product_id = a.product_id
    WHERE ABS(a.price_a - b.price_b) > 0.01
    ORDER BY ABS(a.price_a - b.price_b) DESC
  `;

  const storeAWins: PriceGap[] = [];
  const storeBWins: PriceGap[] = [];

  for (const r of rows as any[]) {
    const priceA = Number(r.price_a);
    const priceB = Number(r.price_b);
    const gap: PriceGap = {
      productName: r.canonical_name,
      productSlug: productToSlug(r.canonical_name, r.product_id),
      cheapestStore: priceA < priceB ? storeA.storeName : storeB.storeName,
      cheapestPrice: Math.min(priceA, priceB),
      expensiveStore: priceA > priceB ? storeA.storeName : storeB.storeName,
      expensivePrice: Math.max(priceA, priceB),
      savings: Math.abs(priceA - priceB),
      pctDiff: Math.round((Math.abs(priceA - priceB) / Math.max(priceA, priceB)) * 100),
    };
    if (priceA < priceB) storeAWins.push(gap);
    else storeBWins.push(gap);
  }

  return {
    storeA,
    storeB,
    storeAWins,
    storeBWins,
    totalCompared: (rows as any[]).length,
  };
}

// ── Category Spotlight Data ───────────────────────────────────────────

export async function getCategorySpotlightData(category: string): Promise<CategorySpotlightData | null> {
  const rows = await taggedSql`
    WITH cat_products AS (
      SELECT
        sp.store_id,
        pm.product_id,
        p.canonical_name,
        p.id,
        COALESCE(sp.sale_price, sp.price) AS effective
      FROM store_products sp
      JOIN product_matches pm ON pm.store_product_id = sp.id
      JOIN products p ON p.id = pm.product_id
      WHERE SPLIT_PART(sp.category_raw, ' / ', 1) = ${category}
        AND sp.price IS NOT NULL
    )
    SELECT
      store_id,
      COUNT(DISTINCT product_id) AS product_count,
      ROUND(AVG(effective)::numeric, 2) AS avg_price
    FROM cat_products
    GROUP BY store_id
    ORDER BY avg_price ASC
  `;

  if ((rows as any[]).length === 0) return null;

  const storeSummaries = (rows as any[]).map((r: any) => ({
    storeName: STORE_NAMES[r.store_id] ?? r.store_id,
    avgPrice: Number(r.avg_price),
    productCount: Number(r.product_count),
  }));

  const gapRows = await taggedSql`
    WITH cat_prices AS (
      SELECT
        p.id AS product_id,
        p.canonical_name,
        sp.store_id,
        COALESCE(sp.sale_price, sp.price) AS effective
      FROM store_products sp
      JOIN product_matches pm ON pm.store_product_id = sp.id
      JOIN products p ON p.id = pm.product_id
      WHERE SPLIT_PART(sp.category_raw, ' / ', 1) = ${category}
        AND sp.price IS NOT NULL
    ),
    extremes AS (
      SELECT
        product_id, canonical_name,
        MIN(effective) AS min_price, MAX(effective) AS max_price,
        (SELECT store_id FROM cat_prices p2 WHERE p2.product_id = cat_prices.product_id ORDER BY effective ASC LIMIT 1) AS cheap_store,
        (SELECT store_id FROM cat_prices p2 WHERE p2.product_id = cat_prices.product_id ORDER BY effective DESC LIMIT 1) AS expensive_store
      FROM cat_prices
      GROUP BY product_id, canonical_name
      HAVING COUNT(DISTINCT store_id) >= 2 AND MAX(effective) - MIN(effective) > 0.01
    )
    SELECT * FROM extremes ORDER BY (max_price - min_price) DESC LIMIT 15
  `;

  const topGaps: PriceGap[] = (gapRows as any[]).map((r: any) => ({
    productName: r.canonical_name,
    productSlug: productToSlug(r.canonical_name, r.product_id),
    cheapestStore: STORE_NAMES[r.cheap_store] ?? r.cheap_store,
    cheapestPrice: Number(r.min_price),
    expensiveStore: STORE_NAMES[r.expensive_store] ?? r.expensive_store,
    expensivePrice: Number(r.max_price),
    savings: Number(r.max_price) - Number(r.min_price),
    pctDiff: Math.round(((Number(r.max_price) - Number(r.min_price)) / Number(r.max_price)) * 100),
  }));

  const totalCount = storeSummaries.reduce((s, r) => s + r.productCount, 0);

  return {
    category,
    categorySlug: category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    productCount: totalCount,
    storeSummaries,
    topGaps,
    cheapestStore: storeSummaries[0]?.storeName ?? "",
  };
}
