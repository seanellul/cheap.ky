import { NextRequest, NextResponse } from "next/server";
import { rawSql } from "@/lib/db";
import { getPriceChanges } from "@/lib/db/price-changes";
import { toSlug } from "@/lib/utils/slug";

function simplifyCategory(raw: string): string {
  const parts = raw.split(" / ");
  return parts.length > 2 ? parts.slice(2).join(" / ") : parts[parts.length - 1];
}

async function resolveCategoryRaws(slug: string): Promise<string[]> {
  const allCats = await rawSql(
    `SELECT DISTINCT category_raw FROM store_products WHERE category_raw IS NOT NULL`
  );
  return allCats
    .filter((c) => toSlug(simplifyCategory(String(c.category_raw))) === slug)
    .map((c) => String(c.category_raw));
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const sort = req.nextUrl.searchParams.get("sort") || "relevance";
  const category = req.nextUrl.searchParams.get("category") || "";

  let categoryRaws: string[] = [];
  if (category) {
    categoryRaws = await resolveCategoryRaws(category);
    if (categoryRaws.length === 0) {
      return NextResponse.json({ results: [] });
    }
  }

  if (q.length < 2 && !category) {
    return NextResponse.json({ results: [] });
  }

  const searchTerm = `%${q}%`;

  // Build dynamic category filter
  let catClause = "";
  const matchedParams: (string | number)[] = [searchTerm, sort];
  const unmatchedParams: (string | number)[] = [searchTerm, sort];
  if (categoryRaws.length > 0) {
    const placeholders = categoryRaws.map((_, i) => `$${i + 3}`).join(",");
    catClause = `AND sp.category_raw IN (${placeholders})`;
    matchedParams.push(...categoryRaws);
    unmatchedParams.push(...categoryRaws);
  }
  const searchClauseMatched = q.length >= 2
    ? `AND (p.canonical_name ILIKE $1 OR p.brand ILIKE $1)`
    : "";
  const searchClauseUnmatched = q.length >= 2
    ? `AND (sp.name ILIKE $1 OR sp.brand ILIKE $1)`
    : "";

  const matched = await rawSql(
    `SELECT
       p.id,
       p.canonical_name,
       p.brand,
       p.size,
       p.image_url,
       MIN(COALESCE(sp.sale_price, sp.price)) AS min_price,
       COUNT(DISTINCT sp.store_id) AS store_count,
       json_agg(json_build_object(
         'sp_id', sp.id,
         'store_id', sp.store_id,
         'price', sp.price,
         'sale_price', sp.sale_price,
         'name', sp.name
       )) AS store_prices
     FROM products p
     JOIN product_matches pm ON pm.product_id = p.id
     JOIN store_products sp ON pm.store_product_id = sp.id
     WHERE sp.price IS NOT NULL
       ${searchClauseMatched}
       ${catClause}
     GROUP BY p.id, p.canonical_name, p.brand, p.size, p.image_url
     ORDER BY
       CASE WHEN $2 = 'price_asc' THEN MIN(COALESCE(sp.sale_price, sp.price)) END ASC NULLS LAST,
       CASE WHEN $2 = 'price_desc' THEN MIN(COALESCE(sp.sale_price, sp.price)) END DESC NULLS LAST,
       CASE WHEN $2 = 'stores' THEN COUNT(DISTINCT sp.store_id) END DESC,
       CASE WHEN $2 = 'relevance' OR $2 IS NULL THEN 0 END,
       COUNT(DISTINCT sp.store_id) DESC,
       p.canonical_name ASC
     LIMIT 50`,
    matchedParams
  );

  const unmatched = await rawSql(
    `SELECT
       sp.id,
       sp.name,
       sp.brand,
       sp.size,
       sp.image_url,
       sp.store_id,
       sp.price,
       sp.sale_price,
       COALESCE(sp.sale_price, sp.price) AS min_price
     FROM store_products sp
     WHERE sp.price IS NOT NULL
       ${searchClauseUnmatched}
       ${catClause}
       AND NOT EXISTS (
         SELECT 1 FROM product_matches pm WHERE pm.store_product_id = sp.id
       )
     ORDER BY
       CASE WHEN $2 = 'price_asc' THEN COALESCE(sp.sale_price, sp.price) END ASC NULLS LAST,
       CASE WHEN $2 = 'price_desc' THEN COALESCE(sp.sale_price, sp.price) END DESC NULLS LAST,
       sp.name ASC
     LIMIT 30`,
    unmatchedParams
  );

  const results = [];
  const allSpIds: number[] = [];

  // Track spId -> storeId mapping per result index
  const resultSpIds: Array<Record<string, number>> = [];

  for (const row of matched) {
    const storePricesArr = row.store_prices as Array<{
      sp_id: number;
      store_id: string;
      price: number | null;
      sale_price: number | null;
      name: string;
    }>;

    const prices: Record<string, { price: number | null; salePrice: number | null; name: string }> = {};
    const storeSpIds: Record<string, number> = {};
    for (const sp of storePricesArr) {
      if (!prices[sp.store_id]) {
        prices[sp.store_id] = {
          price: sp.price,
          salePrice: sp.sale_price,
          name: sp.name,
        };
        allSpIds.push(sp.sp_id);
        storeSpIds[sp.store_id] = sp.sp_id;
      }
    }

    resultSpIds.push(storeSpIds);
    results.push({
      id: Number(row.id),
      name: String(row.canonical_name),
      brand: row.brand as string | null,
      size: row.size as string | null,
      imageUrl: row.image_url as string | null,
      minPrice: row.min_price != null ? Number(row.min_price) : null,
      storeCount: Number(row.store_count),
      prices,
      priceChanges: {} as Record<string, { direction: "up" | "down"; amount: number }>,
    });
  }

  for (const sp of unmatched) {
    const spId = Number(sp.id);
    const storeId = String(sp.store_id);
    allSpIds.push(spId);

    resultSpIds.push({ [storeId]: spId });
    results.push({
      id: -spId,
      name: String(sp.name),
      brand: sp.brand as string | null,
      size: sp.size as string | null,
      imageUrl: sp.image_url as string | null,
      minPrice: sp.min_price != null ? Number(sp.min_price) : null,
      storeCount: 1,
      prices: {
        [storeId]: {
          price: sp.price != null ? Number(sp.price) : null,
          salePrice: sp.sale_price != null ? Number(sp.sale_price) : null,
          name: String(sp.name),
        },
      },
      priceChanges: {} as Record<string, { direction: "up" | "down"; amount: number }>,
    });
  }

  // Batch fetch price changes and merge into results
  const priceChangeMap = await getPriceChanges(allSpIds);
  for (let i = 0; i < results.length; i++) {
    const spIds = resultSpIds[i];
    for (const [storeId, spId] of Object.entries(spIds)) {
      const change = priceChangeMap.get(spId);
      if (change) {
        results[i].priceChanges[storeId] = change;
      }
    }
  }

  // If sorting by price, merge and re-sort both lists
  if (sort === "price_asc") {
    results.sort((a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity));
  } else if (sort === "price_desc") {
    results.sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0));
  }

  return NextResponse.json({ results: results.slice(0, 50) });
}
