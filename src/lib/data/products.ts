import Database from "better-sqlite3";
import path from "path";
import { productToSlug } from "@/lib/utils/slug";

const dbPath = path.join(process.cwd(), "data", "price-comp.db");

function getDb() {
  return new Database(dbPath, { readonly: true });
}

// ── Types ──────────────────────────────────────────────────────────────

export interface ProductRow {
  id: number;
  canonical_name: string;
  brand: string | null;
  category_id: number | null;
  upc: string | null;
  size: string | null;
  image_url: string | null;
}

export interface StorePriceRow {
  store_id: string;
  name: string;
  price: number | null;
  sale_price: number | null;
  size: string | null;
  image_url: string | null;
  source_url: string | null;
  upc: string | null;
  category_raw: string | null;
}

export interface PriceHistoryRow {
  price: number | null;
  sale_price: number | null;
  recorded_at: number;
  store_id: string;
}

export interface ProductData {
  product: ProductRow;
  storePrices: StorePriceRow[];
  history: PriceHistoryRow[];
  categoryRaw: string | null;
}

export interface RelatedProduct {
  id: number;
  canonical_name: string;
  brand: string | null;
  size: string | null;
  image_url: string | null;
  slug: string;
  store_count: number;
  min_price: number | null;
}

export interface ProductListItem {
  id: number;
  canonical_name: string;
  brand: string | null;
  size: string | null;
  image_url: string | null;
  slug: string;
  store_count: number;
  min_price: number | null;
  category_raw: string | null;
}

// ── Queries ────────────────────────────────────────────────────────────

export function getProductBySlug(slug: string): ProductData | null {
  // Extract product ID from slug suffix
  const match = slug.match(/-(\d+)$/);
  if (!match) return null;
  const productId = parseInt(match[1], 10);

  const db = getDb();
  try {
    const product = db
      .prepare(
        `SELECT id, canonical_name, brand, category_id, upc, size, image_url
         FROM products WHERE id = ?`
      )
      .get(productId) as ProductRow | undefined;

    if (!product) return null;

    // Verify slug matches (prevents /prices/wrong-name-123 from working)
    if (productToSlug(product.canonical_name, product.id) !== slug) {
      return null;
    }

    const storePrices = db
      .prepare(
        `SELECT sp.store_id, sp.name, sp.price, sp.sale_price,
                sp.size, sp.image_url, sp.source_url, sp.upc, sp.category_raw
         FROM product_matches pm
         JOIN store_products sp ON pm.store_product_id = sp.id
         WHERE pm.product_id = ?`
      )
      .all(productId) as StorePriceRow[];

    const history = db
      .prepare(
        `SELECT ph.price, ph.sale_price, ph.recorded_at, sp.store_id
         FROM price_history ph
         JOIN store_products sp ON ph.store_product_id = sp.id
         JOIN product_matches pm ON pm.store_product_id = sp.id
         WHERE pm.product_id = ?
         ORDER BY ph.recorded_at ASC`
      )
      .all(productId) as PriceHistoryRow[];

    // Get best category_raw from any matched store product
    const categoryRaw =
      storePrices.find((sp) => sp.category_raw)?.category_raw ?? null;

    return { product, storePrices, history, categoryRaw };
  } finally {
    db.close();
  }
}

export function getRelatedProducts(
  productId: number,
  categoryRaw: string | null,
  limit: number = 8
): RelatedProduct[] {
  if (!categoryRaw) return [];

  const db = getDb();
  try {
    // Extract a top-level category from the raw category path
    // e.g. "Shop / Meat / Bacon" → "Meat"
    const parts = categoryRaw.split("/").map((s) => s.trim());
    const topCategory = parts.length >= 2 ? parts[1] : parts[0];

    const rows = db
      .prepare(
        `SELECT p.id, p.canonical_name, p.brand, p.size, p.image_url,
                COUNT(DISTINCT sp.store_id) as store_count,
                MIN(COALESCE(sp.sale_price, sp.price)) as min_price
         FROM products p
         JOIN product_matches pm ON pm.product_id = p.id
         JOIN store_products sp ON pm.store_product_id = sp.id
         WHERE sp.category_raw LIKE ?
           AND p.id != ?
         GROUP BY p.id
         HAVING store_count >= 2
         ORDER BY store_count DESC, min_price ASC
         LIMIT ?`
      )
      .all(`%${topCategory}%`, productId, limit) as Array<
      ProductRow & { store_count: number; min_price: number | null }
    >;

    return rows.map((r) => ({
      id: r.id,
      canonical_name: r.canonical_name,
      brand: r.brand,
      size: r.size,
      image_url: r.image_url,
      slug: productToSlug(r.canonical_name, r.id),
      store_count: r.store_count,
      min_price: r.min_price,
    }));
  } finally {
    db.close();
  }
}

export function getProductSlugs(): string[] {
  const db = getDb();
  try {
    const rows = db
      .prepare(
        `SELECT p.id, p.canonical_name
         FROM products p
         WHERE EXISTS (
           SELECT 1 FROM product_matches pm WHERE pm.product_id = p.id
         )`
      )
      .all() as Array<{ id: number; canonical_name: string }>;

    return rows.map((r) => productToSlug(r.canonical_name, r.id));
  } finally {
    db.close();
  }
}

// ── Products index / listing ───────────────────────────────────────────

export function getTopCategories(): string[] {
  const db = getDb();
  try {
    const rows = db
      .prepare(
        `SELECT DISTINCT
           TRIM(SUBSTR(
             SUBSTR(category_raw, INSTR(category_raw, '/ ') + 2),
             1,
             CASE
               WHEN INSTR(SUBSTR(category_raw, INSTR(category_raw, '/ ') + 2), ' /') > 0
               THEN INSTR(SUBSTR(category_raw, INSTR(category_raw, '/ ') + 2), ' /') - 1
               ELSE LENGTH(SUBSTR(category_raw, INSTR(category_raw, '/ ') + 2))
             END
           )) as category
         FROM store_products
         WHERE category_raw IS NOT NULL AND category_raw LIKE 'Shop / %'
         ORDER BY category`
      )
      .all() as Array<{ category: string }>;

    return rows
      .map((r) => r.category)
      .filter((c) => c.length > 0 && c.length < 40);
  } finally {
    db.close();
  }
}

export function getProductList(options: {
  page?: number;
  perPage?: number;
  category?: string;
  search?: string;
}): { products: ProductListItem[]; total: number } {
  const { page = 1, perPage = 48, category, search } = options;
  const offset = (page - 1) * perPage;

  const db = getDb();
  try {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (search && search.length >= 2) {
      conditions.push("p.canonical_name LIKE ?");
      params.push(`%${search}%`);
    }

    if (category) {
      conditions.push("sp.category_raw LIKE ?");
      params.push(`%${category}%`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRow = db
      .prepare(
        `SELECT COUNT(DISTINCT p.id) as total
         FROM products p
         JOIN product_matches pm ON pm.product_id = p.id
         JOIN store_products sp ON pm.store_product_id = sp.id
         ${whereClause}`
      )
      .get(...params) as { total: number };

    const rows = db
      .prepare(
        `SELECT p.id, p.canonical_name, p.brand, p.size, p.image_url,
                COUNT(DISTINCT sp.store_id) as store_count,
                MIN(COALESCE(sp.sale_price, sp.price)) as min_price,
                MAX(sp.category_raw) as category_raw
         FROM products p
         JOIN product_matches pm ON pm.product_id = p.id
         JOIN store_products sp ON pm.store_product_id = sp.id
         ${whereClause}
         GROUP BY p.id
         ORDER BY store_count DESC, p.canonical_name ASC
         LIMIT ? OFFSET ?`
      )
      .all(...params, perPage, offset) as Array<
      ProductRow & {
        store_count: number;
        min_price: number | null;
        category_raw: string | null;
      }
    >;

    const products = rows.map((r) => ({
      id: r.id,
      canonical_name: r.canonical_name,
      brand: r.brand,
      size: r.size,
      image_url: r.image_url,
      slug: productToSlug(r.canonical_name, r.id),
      store_count: r.store_count,
      min_price: r.min_price,
      category_raw: r.category_raw,
    }));

    return { products, total: countRow.total };
  } finally {
    db.close();
  }
}
