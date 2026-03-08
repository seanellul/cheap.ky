import { NextRequest, NextResponse } from "next/server";
import { rawSql } from "@/lib/db";

const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_MS = 30_000;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 1) {
    return NextResponse.json({ products: [], categories: [] });
  }

  // Skip autocomplete for barcodes (all digits)
  if (/^\d+$/.test(q)) {
    return NextResponse.json({ products: [], categories: [] });
  }

  const key = q.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return NextResponse.json(cached.data);
  }

  const pattern = `%${q}%`;

  const [productRows, categoryRows] = await Promise.all([
    rawSql(
      `SELECT p.canonical_name AS name, COUNT(DISTINCT pm.store_product_id) AS store_count
       FROM products p
       JOIN product_matches pm ON pm.product_id = p.id
       WHERE p.canonical_name ILIKE $1
       GROUP BY p.canonical_name
       ORDER BY store_count DESC, p.canonical_name
       LIMIT 8`,
      [pattern]
    ),
    rawSql(
      `SELECT DISTINCT
         REPLACE(REPLACE(REPLACE(sp.category_raw, 'Shop / Grocery / ', ''), 'Shop / HBC / ', ''), 'Shop / ', '') AS label
       FROM store_products sp
       WHERE sp.category_raw ILIKE $1
         AND sp.category_raw IS NOT NULL
       ORDER BY label
       LIMIT 4`,
      [pattern]
    ),
  ]);

  const data = {
    products: productRows.map((r) => String(r.name)),
    categories: categoryRows.map((r) => String(r.label)),
  };

  cache.set(key, { data, ts: Date.now() });

  // Evict old entries periodically
  if (cache.size > 200) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now - v.ts > CACHE_MS) cache.delete(k);
    }
  }

  return NextResponse.json(data);
}
