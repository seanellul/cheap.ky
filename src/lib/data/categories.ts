import { rawSql } from "@/lib/db";
import { toSlug, productToSlug } from "@/lib/utils/slug";

export interface CategoryInfo {
  name: string;
  slug: string;
  productCount: number;
  matchedCount: number;
}

export interface CategoryProduct {
  id: number;
  name: string;
  brand: string | null;
  size: string | null;
  imageUrl: string | null;
  slug: string;
  storeCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  savings: number;
  prices: Record<string, { price: number | null; salePrice: number | null }>;
}

export interface CategoryData {
  name: string;
  slug: string;
  productCount: number;
  products: CategoryProduct[];
  totalPages: number;
  avgSavings: number;
  totalSavings: number;
}

/** Simplify raw category to display name: "Shop / Grocery / Dairy" → "Dairy" */
function simplifyCategory(raw: string): string {
  const parts = raw.split(" / ");
  return parts.length > 2 ? parts.slice(2).join(" / ") : parts[parts.length - 1];
}

export async function getCategories(): Promise<CategoryInfo[]> {
  const rows = await rawSql(
    `SELECT sp.category_raw,
            COUNT(DISTINCT sp.id) as product_count
     FROM store_products sp
     WHERE sp.category_raw IS NOT NULL
     GROUP BY sp.category_raw
     HAVING COUNT(DISTINCT sp.id) >= 5
     ORDER BY COUNT(DISTINCT sp.id) DESC`
  );

  // Deduplicate by slug
  const slugMap = new Map<string, CategoryInfo>();

  for (const row of rows) {
    const name = simplifyCategory(String(row.category_raw));
    const slug = toSlug(name);
    if (!slug) continue;

    const existing = slugMap.get(slug);
    if (existing) {
      existing.productCount += Number(row.product_count);
    } else {
      slugMap.set(slug, {
        name,
        slug,
        productCount: Number(row.product_count),
        matchedCount: 0,
      });
    }
  }

  // Get matched counts
  const matchedRows = await rawSql(
    `SELECT sp.category_raw, COUNT(DISTINCT p.id) as matched
     FROM products p
     JOIN product_matches pm ON pm.product_id = p.id AND pm.match_method = 'upc'
     JOIN store_products sp ON pm.store_product_id = sp.id
     WHERE sp.category_raw IS NOT NULL
       AND COALESCE(sp.sale_price, sp.price) > 0
     GROUP BY sp.category_raw`
  );

  for (const row of matchedRows) {
    const slug = toSlug(simplifyCategory(String(row.category_raw)));
    const cat = slugMap.get(slug);
    if (cat) cat.matchedCount += Number(row.matched);
  }

  return Array.from(slugMap.values())
    .filter((c) => c.productCount >= 5)
    .sort((a, b) => b.productCount - a.productCount);
}

export async function getCategoryBySlug(
  slug: string,
  page: number = 1,
  perPage: number = 50
): Promise<CategoryData | null> {
  // Find all raw categories matching this slug
  const allCats = await rawSql(
    `SELECT DISTINCT category_raw
     FROM store_products
     WHERE category_raw IS NOT NULL`
  );

  const matchingRaws = allCats
    .filter((c) => toSlug(simplifyCategory(String(c.category_raw))) === slug)
    .map((c) => String(c.category_raw));

  if (matchingRaws.length === 0) return null;

  const name = simplifyCategory(matchingRaws[0]);
  const placeholders = matchingRaws.map((_, i) => `$${i + 1}`).join(",");
  const offset = (page - 1) * perPage;

  // Count products at 2+ stores in this category
  const [countRow] = await rawSql(
    `SELECT COUNT(*) as c FROM (
      SELECT p.id
      FROM products p
      JOIN product_matches pm ON pm.product_id = p.id AND pm.match_method = 'upc'
      JOIN store_products sp ON pm.store_product_id = sp.id
      WHERE sp.category_raw IN (${placeholders})
        AND COALESCE(sp.sale_price, sp.price) > 0
      GROUP BY p.id
      HAVING COUNT(DISTINCT sp.store_id) >= 2
    ) sub`,
    matchingRaws
  );

  const paramOffset = matchingRaws.length;
  // Get products with prices
  const rows = await rawSql(
    `SELECT p.id, p.canonical_name, p.brand, p.size, p.image_url,
            COUNT(DISTINCT sp.store_id) as store_count,
            MIN(COALESCE(sp.sale_price, sp.price)) as min_price,
            MAX(COALESCE(sp.sale_price, sp.price)) as max_price,
            MAX(COALESCE(sp.sale_price, sp.price)) - MIN(COALESCE(sp.sale_price, sp.price)) as savings
     FROM products p
     JOIN product_matches pm ON pm.product_id = p.id AND pm.match_method = 'upc'
     JOIN store_products sp ON pm.store_product_id = sp.id
     WHERE sp.category_raw IN (${placeholders})
       AND COALESCE(sp.sale_price, sp.price) > 0
     GROUP BY p.id, p.canonical_name, p.brand, p.size, p.image_url
     HAVING COUNT(DISTINCT sp.store_id) >= 2
     ORDER BY MAX(COALESCE(sp.sale_price, sp.price)) - MIN(COALESCE(sp.sale_price, sp.price)) DESC
     LIMIT $${paramOffset + 1} OFFSET $${paramOffset + 2}`,
    [...matchingRaws, perPage, offset]
  );

  // Get per-store prices for these products
  const productIds = rows.map((r) => Number(r.id));
  const priceMap: Record<
    number,
    Record<string, { price: number | null; salePrice: number | null }>
  > = {};

  if (productIds.length > 0) {
    const pPlaceholders = productIds.map((_, i) => `$${i + 1}`).join(",");
    const priceRows = await rawSql(
      `SELECT pm.product_id, sp.store_id, sp.price, sp.sale_price
       FROM product_matches pm
       JOIN store_products sp ON pm.store_product_id = sp.id
       WHERE pm.product_id IN (${pPlaceholders}) AND pm.match_method = 'upc'`,
      productIds
    );

    for (const pr of priceRows) {
      const pid = Number(pr.product_id);
      if (!priceMap[pid]) priceMap[pid] = {};
      priceMap[pid][String(pr.store_id)] = {
        price: pr.price != null ? Number(pr.price) : null,
        salePrice: pr.sale_price != null ? Number(pr.sale_price) : null,
      };
    }
  }

  // Stats
  const [statsRow] = await rawSql(
    `SELECT
       AVG(savings) as avg_savings,
       SUM(savings) as total_savings
     FROM (
       SELECT MAX(COALESCE(sp.sale_price, sp.price)) - MIN(COALESCE(sp.sale_price, sp.price)) as savings
       FROM products p
       JOIN product_matches pm ON pm.product_id = p.id AND pm.match_method = 'upc'
       JOIN store_products sp ON pm.store_product_id = sp.id
       WHERE sp.category_raw IN (${placeholders})
         AND COALESCE(sp.sale_price, sp.price) > 0
       GROUP BY p.id
       HAVING COUNT(DISTINCT sp.store_id) >= 2
     ) sub`,
    matchingRaws
  );

  const products: CategoryProduct[] = rows.map((r) => ({
    id: Number(r.id),
    name: String(r.canonical_name),
    brand: r.brand as string | null,
    size: r.size as string | null,
    imageUrl: r.image_url as string | null,
    slug: productToSlug(String(r.canonical_name), Number(r.id)),
    storeCount: Number(r.store_count),
    minPrice: r.min_price != null ? Number(r.min_price) : null,
    maxPrice: r.max_price != null ? Number(r.max_price) : null,
    savings: Number(r.savings),
    prices: priceMap[Number(r.id)] || {},
  }));

  return {
    name,
    slug,
    productCount: Number(countRow.c),
    products,
    totalPages: Math.ceil(Number(countRow.c) / perPage),
    avgSavings: Number(statsRow.avg_savings ?? 0),
    totalSavings: Number(statsRow.total_savings ?? 0),
  };
}
