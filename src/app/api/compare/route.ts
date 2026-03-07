import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "price-comp.db");

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
    GROUP BY p.id
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

  const sqlite = new Database(dbPath, { readonly: true });

  try {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (category) {
      conditions.push("category_raw LIKE ?");
      params.push(`%${category}%`);
    }
    if (search) {
      conditions.push("(name LIKE ? OR brand LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const orderMap: Record<string, string> = {
      savings: "savings DESC",
      name: "name ASC",
      price: "min_price ASC",
      pct: "savings * 1.0 / min_price DESC",
    };
    const orderClause = orderMap[sort] || "savings DESC";

    const countRow = sqlite
      .prepare(`${MATCHED_CTE} SELECT COUNT(*) as cnt FROM matched ${whereClause}`)
      .get(...params) as { cnt: number } | undefined;

    const rows = sqlite
      .prepare(
        `${MATCHED_CTE} SELECT * FROM matched ${whereClause} ORDER BY ${orderClause} LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as Array<{
      product_id: number;
      name: string;
      brand: string | null;
      size: string | null;
      image_url: string | null;
      num_stores: number;
      min_price: number;
      max_price: number;
      savings: number;
      category_raw: string | null;
    }>;

    const productIds = rows.map((r) => r.product_id);
    const storePrices: Record<
      number,
      Record<string, { price: number | null; salePrice: number | null; productName: string }>
    > = {};

    if (productIds.length > 0) {
      const placeholders = productIds.map(() => "?").join(",");
      const priceRows = sqlite
        .prepare(
          `SELECT pm.product_id, sp.store_id, sp.price, sp.sale_price, sp.name
           FROM product_matches pm
           JOIN store_products sp ON pm.store_product_id = sp.id
           WHERE pm.product_id IN (${placeholders}) AND pm.match_method = 'upc'`
        )
        .all(...productIds) as Array<{
        product_id: number;
        store_id: string;
        price: number | null;
        sale_price: number | null;
        name: string;
      }>;

      for (const row of priceRows) {
        if (!storePrices[row.product_id]) storePrices[row.product_id] = {};
        storePrices[row.product_id][row.store_id] = {
          price: row.price,
          salePrice: row.sale_price,
          productName: row.name,
        };
      }
    }

    // Get categories for filter sidebar
    const categories = sqlite
      .prepare(
        `${MATCHED_CTE} SELECT category_raw, COUNT(*) as cnt FROM matched WHERE category_raw IS NOT NULL GROUP BY category_raw ORDER BY cnt DESC LIMIT 50`
      )
      .all() as Array<{ category_raw: string; cnt: number }>;

    const items = rows.map((r) => ({
      id: r.product_id,
      name: r.name,
      brand: r.brand,
      size: r.size,
      imageUrl: r.image_url,
      numStores: r.num_stores,
      minPrice: r.min_price,
      maxPrice: r.max_price,
      savings: r.savings,
      categoryRaw: r.category_raw,
      prices: storePrices[r.product_id] || {},
    }));

    return NextResponse.json({
      items,
      total: countRow?.cnt ?? 0,
      page,
      limit,
      categories: categories.map((c) => ({ name: c.category_raw, count: c.cnt })),
    });
  } finally {
    sqlite.close();
  }
}
