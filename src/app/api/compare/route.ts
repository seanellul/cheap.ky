import { NextRequest, NextResponse } from "next/server";
import { rawSql } from "@/lib/db";
import { getPriceChanges } from "@/lib/db/price-changes";

const MATCHED_CTE = `
  WITH matched AS (
    SELECT
      p.id as product_id,
      p.canonical_name as name,
      p.brand,
      p.size,
      p.image_url,
      COUNT(DISTINCT sp.store_id) as num_stores,
      MIN(COALESCE(sp.sale_price, sp.price)) as min_price,
      MAX(COALESCE(sp.sale_price, sp.price)) as max_price,
      MAX(COALESCE(sp.sale_price, sp.price)) - MIN(COALESCE(sp.sale_price, sp.price)) as savings,
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"));
  const sort = searchParams.get("sort") || "savings";
  const category = searchParams.get("category") || "";
  const search = searchParams.get("q") || "";
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: (string | number)[] = [];
  let paramIdx = 1;

  if (category) {
    conditions.push(`category_raw ILIKE $${paramIdx++}`);
    params.push(`%${category}%`);
  }
  if (search) {
    conditions.push(`(name ILIKE $${paramIdx} OR brand ILIKE $${paramIdx + 1})`);
    params.push(`%${search}%`, `%${search}%`);
    paramIdx += 2;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const orderMap: Record<string, string> = {
    savings: "savings DESC",
    name: "name ASC",
    price: "min_price ASC",
    pct: "savings * 1.0 / min_price DESC",
  };
  const orderClause = orderMap[sort] || "savings DESC";

  const [countRow] = await rawSql(
    `${MATCHED_CTE} SELECT COUNT(*) as cnt FROM matched ${whereClause}`,
    params
  );

  const rows = await rawSql(
    `${MATCHED_CTE} SELECT * FROM matched ${whereClause} ORDER BY ${orderClause} LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset]
  );

  const productIds = rows.map((r) => Number(r.product_id));
  const storePrices: Record<
    number,
    Record<string, { price: number | null; salePrice: number | null; productName: string; updatedAt: string | null }>
  > = {};
  // Track spId per product+store for price change lookup
  const productStoreSpIds: Record<number, Record<string, number>> = {};

  if (productIds.length > 0) {
    const placeholders = productIds.map((_, i) => `$${i + 1}`).join(",");
    const priceRows = await rawSql(
      `SELECT pm.product_id, sp.id as sp_id, sp.store_id, sp.price, sp.sale_price, sp.name, sp.updated_at
       FROM product_matches pm
       JOIN store_products sp ON pm.store_product_id = sp.id
       WHERE pm.product_id IN (${placeholders}) AND pm.match_method = 'upc'`,
      productIds
    );

    for (const row of priceRows) {
      const pid = Number(row.product_id);
      const spId = Number(row.sp_id);
      const storeId = String(row.store_id);
      if (!storePrices[pid]) storePrices[pid] = {};
      storePrices[pid][storeId] = {
        price: row.price != null ? Number(row.price) : null,
        salePrice: row.sale_price != null ? Number(row.sale_price) : null,
        productName: String(row.name),
        updatedAt: row.updated_at ? String(row.updated_at) : null,
      };
      if (!productStoreSpIds[pid]) productStoreSpIds[pid] = {};
      productStoreSpIds[pid][storeId] = spId;
    }
  }

  // Batch fetch price changes
  const allSpIds = Object.values(productStoreSpIds).flatMap((m) => Object.values(m));
  const priceChangeMap = await getPriceChanges(allSpIds);

  // Get categories for filter sidebar
  const categories = await rawSql(
    `${MATCHED_CTE} SELECT category_raw, COUNT(*) as cnt FROM matched WHERE category_raw IS NOT NULL GROUP BY category_raw ORDER BY COUNT(*) DESC LIMIT 50`
  );

  const items = rows.map((r) => {
    const pid = Number(r.product_id);
    const spIds = productStoreSpIds[pid] || {};
    const priceChanges: Record<string, { direction: "up" | "down"; amount: number }> = {};
    for (const [storeId, spId] of Object.entries(spIds)) {
      const change = priceChangeMap.get(spId);
      if (change) priceChanges[storeId] = change;
    }
    return {
      id: pid,
      name: String(r.name),
      brand: r.brand as string | null,
      size: r.size as string | null,
      imageUrl: r.image_url as string | null,
      numStores: Number(r.num_stores),
      minPrice: Number(r.min_price),
      maxPrice: Number(r.max_price),
      savings: Number(r.savings),
      categoryRaw: r.category_raw as string | null,
      prices: storePrices[pid] || {},
      priceChanges,
    };
  });

  return NextResponse.json({
    items,
    total: Number(countRow?.cnt ?? 0),
    page,
    limit,
    categories: categories.map((c) => ({ name: c.category_raw, count: Number(c.cnt) })),
  });
}
