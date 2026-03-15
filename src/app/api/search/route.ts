import { NextRequest, NextResponse } from "next/server";
import { rawSql } from "@/lib/db";
import { getPriceChanges } from "@/lib/db/price-changes";
import { normalizeUpc } from "@/lib/utils/upc";
import { formatUnitPrice } from "@/lib/utils/unit-price";
import { toSlug } from "@/lib/utils/slug";

function looksLikeBarcode(q: string): boolean {
  const digits = q.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 14 && digits === q.trim();
}

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
  const typeFilter = req.nextUrl.searchParams.get("type") || "";
  const storeFilter = req.nextUrl.searchParams.get("store") || "";
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

  // Barcode scan: if the query looks like a UPC/EAN, do an exact lookup first
  if (looksLikeBarcode(q)) {
    const normalized = normalizeUpc(q);
    if (normalized) {
      const barcodeParams: string[] = [normalized];
      if (storeFilter) barcodeParams.push(storeFilter);

      const barcodeResults = await rawSql(
        `SELECT
           p.id,
           p.canonical_name,
           p.brand,
           p.size,
           p.image_url,
           MIN(COALESCE(sp.sale_price, sp.price)) AS min_price,
           COUNT(DISTINCT sp.store_id) AS store_count,
           json_agg(json_build_object(
             'store_id', sp.store_id,
             'price', sp.price,
             'sale_price', sp.sale_price,
             'name', sp.name,
            'updated_at', sp.updated_at
           )) AS store_prices
         FROM products p
         JOIN product_matches pm ON pm.product_id = p.id
         JOIN store_products sp ON pm.store_product_id = sp.id
         WHERE sp.upc = $1 AND sp.price IS NOT NULL${storeFilter ? ` AND sp.store_id = $2` : ""}
         GROUP BY p.id, p.canonical_name, p.brand, p.size, p.image_url
         LIMIT 5`,
        barcodeParams
      );

      if (barcodeResults.length > 0) {
        const results = barcodeResults.map((row: Record<string, unknown>) => {
          const storePricesArr = row.store_prices as Array<{
            store_id: string; price: number | null; sale_price: number | null; name: string; updated_at: string | null;
          }>;
          const prices: Record<string, { price: number | null; salePrice: number | null; name: string; updatedAt: string | null }> = {};
          for (const sp of storePricesArr) {
            if (!prices[sp.store_id]) {
              prices[sp.store_id] = { price: sp.price, salePrice: sp.sale_price, name: sp.name, updatedAt: sp.updated_at ?? null };
            }
          }
          return {
            id: Number(row.id),
            name: String(row.canonical_name),
            brand: row.brand as string | null,
            size: row.size as string | null,
            imageUrl: row.image_url as string | null,
            minPrice: row.min_price != null ? Number(row.min_price) : null,
            storeCount: Number(row.store_count),
            prices,
            barcodeScan: true,
          };
        });
        return NextResponse.json({ results, barcodeScan: true });
      }

      // No matched product — try unmatched store_products by UPC
      const unmatchedBarcodeParams: string[] = [normalized];
      if (storeFilter) unmatchedBarcodeParams.push(storeFilter);

      const unmatchedBarcode = await rawSql(
        `SELECT sp.id, sp.name, sp.brand, sp.size, sp.image_url, sp.store_id,
                sp.price, sp.sale_price, sp.updated_at, COALESCE(sp.sale_price, sp.price) AS min_price
         FROM store_products sp
         WHERE sp.upc = $1 AND sp.price IS NOT NULL${storeFilter ? ` AND sp.store_id = $2` : ""}
         LIMIT 5`,
        unmatchedBarcodeParams
      );

      if (unmatchedBarcode.length > 0) {
        const results = unmatchedBarcode.map((sp: Record<string, unknown>) => ({
          id: -Number(sp.id),
          name: String(sp.name),
          brand: sp.brand as string | null,
          size: sp.size as string | null,
          imageUrl: sp.image_url as string | null,
          minPrice: sp.min_price != null ? Number(sp.min_price) : null,
          storeCount: 1,
          prices: {
            [String(sp.store_id)]: {
              price: sp.price != null ? Number(sp.price) : null,
              salePrice: sp.sale_price != null ? Number(sp.sale_price) : null,
              name: String(sp.name),
              updatedAt: sp.updated_at ? String(sp.updated_at) : null,
            },
          },
          barcodeScan: true,
        }));
        return NextResponse.json({ results, barcodeScan: true });
      }

      // Barcode not found in DB at all
      return NextResponse.json({ results: [], barcodeScan: true, barcodeNotFound: true });
    }
  }

  const searchTerm = `%${q}%`;

  // Build dynamic filters
  const matchedParams: (string | number)[] = [searchTerm, sort];

  // Category filter
  let catClause = "";
  if (categoryRaws.length > 0) {
    const placeholders = categoryRaws.map((_, i) => `$${matchedParams.length + i + 1}`).join(",");
    catClause = `AND sp.category_raw IN (${placeholders})`;
    matchedParams.push(...categoryRaws);
  }

  // Type filter
  let matchedTypeCondition = "";
  if (typeFilter) {
    matchedParams.push(`%${typeFilter}%`);
    matchedTypeCondition = `AND sp.category_raw ILIKE $${matchedParams.length}`;
  }

  // Store filter
  let matchedStoreCondition = "";
  if (storeFilter) {
    matchedParams.push(storeFilter);
    matchedStoreCondition = ` AND sp.store_id = $${matchedParams.length}`;
  }

  // Search clause (optional when browsing by category)
  const searchClauseMatched = q.length >= 2
    ? `AND (p.canonical_name ILIKE $1 OR p.brand ILIKE $1)`
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
       MAX(sp.category_raw) AS category_raw,
       json_agg(json_build_object(
         'sp_id', sp.id,
         'store_id', sp.store_id,
         'price', sp.price,
         'sale_price', sp.sale_price,
         'name', sp.name,
         'updated_at', sp.updated_at,
         'unit_size', sp.unit_size,
         'unit_type', sp.unit_type,
         'confidence', pm.confidence,
         'match_method', pm.match_method
       )) AS store_prices
     FROM products p
     JOIN product_matches pm ON pm.product_id = p.id
     JOIN store_products sp ON pm.store_product_id = sp.id
     WHERE sp.price IS NOT NULL
       ${searchClauseMatched}
       ${catClause}
       ${matchedTypeCondition}${matchedStoreCondition}
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

  // Build unmatched query filters
  const unmatchedParams: (string | number)[] = [searchTerm, sort];
  let unmatchedCatClause = "";
  if (categoryRaws.length > 0) {
    const placeholders = categoryRaws.map((_, i) => `$${unmatchedParams.length + i + 1}`).join(",");
    unmatchedCatClause = `AND sp.category_raw IN (${placeholders})`;
    unmatchedParams.push(...categoryRaws);
  }
  let unmatchedTypeCondition = "";
  if (typeFilter) {
    unmatchedParams.push(`%${typeFilter}%`);
    unmatchedTypeCondition = `AND sp.category_raw ILIKE $${unmatchedParams.length}`;
  }
  let unmatchedStoreCondition = "";
  if (storeFilter) {
    unmatchedParams.push(storeFilter);
    unmatchedStoreCondition = ` AND sp.store_id = $${unmatchedParams.length}`;
  }
  const searchClauseUnmatched = q.length >= 2
    ? `AND (sp.name ILIKE $1 OR sp.brand ILIKE $1)`
    : "";

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
       sp.updated_at,
       sp.category_raw,
       sp.unit_size,
       sp.unit_type,
       COALESCE(sp.sale_price, sp.price) AS min_price
     FROM store_products sp
     WHERE sp.price IS NOT NULL
       ${searchClauseUnmatched}
       ${unmatchedCatClause}
       ${unmatchedTypeCondition}${unmatchedStoreCondition}
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
      updated_at: string | null;
      unit_size: number | null;
      unit_type: string | null;
      confidence: number | null;
      match_method: string | null;
    }>;

    const prices: Record<string, { price: number | null; salePrice: number | null; name: string; updatedAt: string | null; unitPrice: string | null; matchQuality: string }> = {};
    const storeSpIds: Record<string, number> = {};
    for (const sp of storePricesArr) {
      if (!prices[sp.store_id]) {
        const effectivePrice = sp.sale_price ?? sp.price;
        const unitPriceLabel = effectivePrice != null
          ? formatUnitPrice(effectivePrice, sp.unit_size, sp.unit_type)
          : null;

        // Determine match quality from method + confidence
        let matchQuality = "matched";
        if (sp.match_method === "upc") {
          matchQuality = "upc";
        } else if (sp.match_method === "fuzzy_name" || sp.match_method === "ai") {
          matchQuality = (sp.confidence ?? 0) >= 0.85 ? "fuzzy_high" : "fuzzy_low";
        }

        prices[sp.store_id] = {
          price: sp.price,
          salePrice: sp.sale_price,
          name: sp.name,
          updatedAt: sp.updated_at ?? null,
          unitPrice: unitPriceLabel,
          matchQuality,
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
      categoryRaw: row.category_raw as string | null,
      prices,
      priceChanges: {} as Record<string, { direction: "up" | "down"; amount: number }>,
    });
  }

  for (const sp of unmatched) {
    const spId = Number(sp.id);
    const storeId = String(sp.store_id);
    allSpIds.push(spId);

    const effectivePrice = sp.sale_price != null ? Number(sp.sale_price) : (sp.price != null ? Number(sp.price) : null);
    const unitPriceLabel = effectivePrice != null
      ? formatUnitPrice(effectivePrice, sp.unit_size as number | null, sp.unit_type as string | null)
      : null;

    resultSpIds.push({ [storeId]: spId });
    results.push({
      id: -spId,
      name: String(sp.name),
      brand: sp.brand as string | null,
      size: sp.size as string | null,
      imageUrl: sp.image_url as string | null,
      minPrice: sp.min_price != null ? Number(sp.min_price) : null,
      storeCount: 1,
      categoryRaw: sp.category_raw as string | null,
      prices: {
        [storeId]: {
          price: sp.price != null ? Number(sp.price) : null,
          salePrice: sp.sale_price != null ? Number(sp.sale_price) : null,
          name: String(sp.name),
          updatedAt: sp.updated_at ? String(sp.updated_at) : null,
          unitPrice: unitPriceLabel,
          matchQuality: "unmatched",
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

  // Aggregate available product types for the current search (ignoring active type filter)
  const typesRows = await rawSql(
    `SELECT
       REPLACE(REPLACE(REPLACE(sp.category_raw, 'Shop / Grocery / ', ''), 'Shop / HBC / ', ''), 'Shop / ', '') AS label,
       COUNT(*) AS cnt
     FROM store_products sp
     WHERE (sp.name ILIKE $1 OR sp.brand ILIKE $1)
       AND sp.price IS NOT NULL
       AND sp.category_raw IS NOT NULL
     GROUP BY label
     ORDER BY cnt DESC
     LIMIT 10`,
    [searchTerm]
  );
  const types = typesRows.map((r) => String(r.label));

  // If no results and not a barcode, try word-split fallback for suggestions
  if (results.length === 0 && !looksLikeBarcode(q)) {
    const words = q
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .filter((w) => w.length >= 2);
    if (words.length > 0) {
      const wordConditions = words
        .map((_, i) => `p.canonical_name ILIKE $${i + 1}`)
        .join(" OR ");
      const wordParams = words.map((w) => `%${w}%`);

      const suggestedMatched = await rawSql(
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
             'name', sp.name,
             'updated_at', sp.updated_at
           )) AS store_prices
         FROM products p
         JOIN product_matches pm ON pm.product_id = p.id
         JOIN store_products sp ON pm.store_product_id = sp.id
         WHERE (${wordConditions})
           AND sp.price IS NOT NULL
         GROUP BY p.id, p.canonical_name, p.brand, p.size, p.image_url
         ORDER BY COUNT(DISTINCT sp.store_id) DESC, p.canonical_name ASC
         LIMIT 6`,
        wordParams
      );

      const suggestions = suggestedMatched.map(
        (row: Record<string, unknown>) => {
          const storePricesArr = row.store_prices as Array<{
            sp_id: number;
            store_id: string;
            price: number | null;
            sale_price: number | null;
            name: string;
            updated_at: string | null;
          }>;
          const prices: Record<
            string,
            {
              price: number | null;
              salePrice: number | null;
              name: string;
              updatedAt: string | null;
            }
          > = {};
          for (const sp of storePricesArr) {
            if (!prices[sp.store_id]) {
              prices[sp.store_id] = {
                price: sp.price,
                salePrice: sp.sale_price,
                name: sp.name,
                updatedAt: sp.updated_at ?? null,
              };
            }
          }
          return {
            id: Number(row.id),
            name: String(row.canonical_name),
            brand: row.brand as string | null,
            size: row.size as string | null,
            imageUrl: row.image_url as string | null,
            minPrice:
              row.min_price != null ? Number(row.min_price) : null,
            storeCount: Number(row.store_count),
            prices,
          };
        }
      );

      return NextResponse.json({ results: [], suggestions, types });
    }
  }

  return NextResponse.json({
    results: results.slice(0, 50),
    suggestions: [],
    types,
  });
}
