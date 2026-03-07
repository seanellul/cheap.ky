import Database from "better-sqlite3";
import path from "path";
import { toSlug, productToSlug } from "@/lib/utils/slug";

const dbPath = path.join(process.cwd(), "data", "price-comp.db");

function getDb() {
  return new Database(dbPath, { readonly: true });
}

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

export function getCategories(): CategoryInfo[] {
  const db = getDb();
  try {
    const rows = db
      .prepare(
        `SELECT sp.category_raw,
                COUNT(DISTINCT sp.id) as product_count
         FROM store_products sp
         WHERE sp.category_raw IS NOT NULL
         GROUP BY sp.category_raw
         HAVING product_count >= 5
         ORDER BY product_count DESC`
      )
      .all() as Array<{ category_raw: string; product_count: number }>;

    // Deduplicate by slug (multiple raw categories can map to same slug)
    const slugMap = new Map<string, CategoryInfo>();

    for (const row of rows) {
      const name = simplifyCategory(row.category_raw);
      const slug = toSlug(name);
      if (!slug) continue;

      const existing = slugMap.get(slug);
      if (existing) {
        existing.productCount += row.product_count;
      } else {
        slugMap.set(slug, {
          name,
          slug,
          productCount: row.product_count,
          matchedCount: 0,
        });
      }
    }

    // Get matched counts (products at 2+ stores) per category
    const matchedRows = db
      .prepare(
        `SELECT sp.category_raw, COUNT(DISTINCT p.id) as matched
         FROM products p
         JOIN product_matches pm ON pm.product_id = p.id AND pm.match_method = 'upc'
         JOIN store_products sp ON pm.store_product_id = sp.id
         WHERE sp.category_raw IS NOT NULL
           AND COALESCE(sp.sale_price, sp.price) > 0
         GROUP BY sp.category_raw`
      )
      .all() as Array<{ category_raw: string; matched: number }>;

    for (const row of matchedRows) {
      const slug = toSlug(simplifyCategory(row.category_raw));
      const cat = slugMap.get(slug);
      if (cat) cat.matchedCount += row.matched;
    }

    return Array.from(slugMap.values())
      .filter((c) => c.productCount >= 5)
      .sort((a, b) => b.productCount - a.productCount);
  } finally {
    db.close();
  }
}

export function getCategoryBySlug(
  slug: string,
  page: number = 1,
  perPage: number = 50
): CategoryData | null {
  const db = getDb();
  try {
    // Find all raw categories matching this slug
    const allCats = db
      .prepare(
        `SELECT DISTINCT category_raw
         FROM store_products
         WHERE category_raw IS NOT NULL`
      )
      .all() as Array<{ category_raw: string }>;

    const matchingRaws = allCats
      .filter((c) => toSlug(simplifyCategory(c.category_raw)) === slug)
      .map((c) => c.category_raw);

    if (matchingRaws.length === 0) return null;

    const name = simplifyCategory(matchingRaws[0]);
    const placeholders = matchingRaws.map(() => "?").join(",");
    const offset = (page - 1) * perPage;

    // Count products at 2+ stores in this category
    const countRow = db
      .prepare(
        `SELECT COUNT(*) as c FROM (
          SELECT p.id
          FROM products p
          JOIN product_matches pm ON pm.product_id = p.id AND pm.match_method = 'upc'
          JOIN store_products sp ON pm.store_product_id = sp.id
          WHERE sp.category_raw IN (${placeholders})
            AND COALESCE(sp.sale_price, sp.price) > 0
          GROUP BY p.id
          HAVING COUNT(DISTINCT sp.store_id) >= 2
        )`
      )
      .get(...matchingRaws) as { c: number };

    // Get products with prices
    const rows = db
      .prepare(
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
         GROUP BY p.id
         HAVING COUNT(DISTINCT sp.store_id) >= 2
         ORDER BY savings DESC
         LIMIT ? OFFSET ?`
      )
      .all(...matchingRaws, perPage, offset) as Array<{
      id: number;
      canonical_name: string;
      brand: string | null;
      size: string | null;
      image_url: string | null;
      store_count: number;
      min_price: number | null;
      max_price: number | null;
      savings: number;
    }>;

    // Get per-store prices for these products
    const productIds = rows.map((r) => r.id);
    const priceMap: Record<
      number,
      Record<string, { price: number | null; salePrice: number | null }>
    > = {};

    if (productIds.length > 0) {
      const pPlaceholders = productIds.map(() => "?").join(",");
      const priceRows = db
        .prepare(
          `SELECT pm.product_id, sp.store_id, sp.price, sp.sale_price
           FROM product_matches pm
           JOIN store_products sp ON pm.store_product_id = sp.id
           WHERE pm.product_id IN (${pPlaceholders}) AND pm.match_method = 'upc'`
        )
        .all(...productIds) as Array<{
        product_id: number;
        store_id: string;
        price: number | null;
        sale_price: number | null;
      }>;

      for (const pr of priceRows) {
        if (!priceMap[pr.product_id]) priceMap[pr.product_id] = {};
        priceMap[pr.product_id][pr.store_id] = {
          price: pr.price,
          salePrice: pr.sale_price,
        };
      }
    }

    // Stats
    const statsRow = db
      .prepare(
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
         )`
      )
      .get(...matchingRaws) as {
      avg_savings: number | null;
      total_savings: number | null;
    };

    const products: CategoryProduct[] = rows.map((r) => ({
      id: r.id,
      name: r.canonical_name,
      brand: r.brand,
      size: r.size,
      imageUrl: r.image_url,
      slug: productToSlug(r.canonical_name, r.id),
      storeCount: r.store_count,
      minPrice: r.min_price,
      maxPrice: r.max_price,
      savings: r.savings,
      prices: priceMap[r.id] || {},
    }));

    return {
      name,
      slug,
      productCount: countRow.c,
      products,
      totalPages: Math.ceil(countRow.c / perPage),
      avgSavings: statsRow.avg_savings ?? 0,
      totalSavings: statsRow.total_savings ?? 0,
    };
  } finally {
    db.close();
  }
}
