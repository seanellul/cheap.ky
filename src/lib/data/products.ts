import { rawSql } from "@/lib/db";
import { productToSlug } from "@/lib/utils/slug";

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
  recorded_at: string;
  store_id: string;
}

export interface RatingCounts {
  up: number;
  down: number;
}

export interface ProductData {
  product: ProductRow;
  storePrices: StorePriceRow[];
  history: PriceHistoryRow[];
  categoryRaw: string | null;
  ratings: Record<string, RatingCounts>;
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

export async function getRatingsForProduct(
  productId: number
): Promise<Record<string, RatingCounts>> {
  const rows = await rawSql(
    `SELECT store_id,
            SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as up,
            SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) as down
     FROM product_ratings
     WHERE product_id = $1
     GROUP BY store_id`,
    [productId]
  );

  const result: Record<string, RatingCounts> = {};
  for (const r of rows) {
    result[String(r.store_id)] = {
      up: Number(r.up),
      down: Number(r.down),
    };
  }
  return result;
}

export async function getProductBySlug(slug: string): Promise<ProductData | null> {
  // Extract product ID from slug suffix
  const match = slug.match(/-(\d+)$/);
  if (!match) return null;
  const productId = parseInt(match[1], 10);

  const products = await rawSql(
    `SELECT id, canonical_name, brand, category_id, upc, size, image_url
     FROM products WHERE id = $1`,
    [productId]
  );

  if (products.length === 0) return null;
  const product = products[0] as unknown as ProductRow;

  // Verify slug matches
  if (productToSlug(product.canonical_name, product.id) !== slug) {
    return null;
  }

  const storePrices = await rawSql(
    `SELECT sp.store_id, sp.name, sp.price, sp.sale_price,
            sp.size, sp.image_url, sp.source_url, sp.upc, sp.category_raw
     FROM product_matches pm
     JOIN store_products sp ON pm.store_product_id = sp.id
     WHERE pm.product_id = $1`,
    [productId]
  ) as unknown as StorePriceRow[];

  const history = await rawSql(
    `SELECT ph.price, ph.sale_price, ph.recorded_at, sp.store_id
     FROM price_history ph
     JOIN store_products sp ON ph.store_product_id = sp.id
     JOIN product_matches pm ON pm.store_product_id = sp.id
     WHERE pm.product_id = $1
     ORDER BY ph.recorded_at ASC`,
    [productId]
  ) as unknown as PriceHistoryRow[];

  const categoryRaw =
    storePrices.find((sp) => sp.category_raw)?.category_raw ?? null;

  const ratings = await getRatingsForProduct(productId);

  return { product, storePrices, history, categoryRaw, ratings };
}

export async function getRelatedProducts(
  productId: number,
  categoryRaw: string | null,
  limit: number = 8
): Promise<RelatedProduct[]> {
  if (!categoryRaw) return [];

  const parts = categoryRaw.split("/").map((s) => s.trim());
  const topCategory = parts.length >= 2 ? parts[1] : parts[0];

  const rows = await rawSql(
    `SELECT p.id, p.canonical_name, p.brand, p.size, p.image_url,
            COUNT(DISTINCT sp.store_id) as store_count,
            MIN(COALESCE(sp.sale_price, sp.price)) as min_price
     FROM products p
     JOIN product_matches pm ON pm.product_id = p.id
     JOIN store_products sp ON pm.store_product_id = sp.id
     WHERE sp.category_raw LIKE $1
       AND p.id != $2
     GROUP BY p.id, p.canonical_name, p.brand, p.size, p.image_url
     HAVING COUNT(DISTINCT sp.store_id) >= 2
     ORDER BY COUNT(DISTINCT sp.store_id) DESC, MIN(COALESCE(sp.sale_price, sp.price)) ASC
     LIMIT $3`,
    [`%${topCategory}%`, productId, limit]
  );

  return rows.map((r: Record<string, unknown>) => ({
    id: Number(r.id),
    canonical_name: String(r.canonical_name),
    brand: r.brand as string | null,
    size: r.size as string | null,
    image_url: r.image_url as string | null,
    slug: productToSlug(String(r.canonical_name), Number(r.id)),
    store_count: Number(r.store_count),
    min_price: r.min_price != null ? Number(r.min_price) : null,
  }));
}

export async function getProductSlugs(): Promise<string[]> {
  const rows = await rawSql(
    `SELECT p.id, p.canonical_name
     FROM products p
     WHERE EXISTS (
       SELECT 1 FROM product_matches pm WHERE pm.product_id = p.id
     )`
  );

  return rows.map((r: Record<string, unknown>) => productToSlug(String(r.canonical_name), Number(r.id)));
}

// ── Products index / listing ───────────────────────────────────────────

export async function getTopCategories(): Promise<string[]> {
  const rows = await rawSql(
    `SELECT DISTINCT
       TRIM(SUBSTRING(
         SUBSTRING(category_raw FROM POSITION('/ ' IN category_raw) + 2),
         1,
         CASE
           WHEN POSITION(' /' IN SUBSTRING(category_raw FROM POSITION('/ ' IN category_raw) + 2)) > 0
           THEN POSITION(' /' IN SUBSTRING(category_raw FROM POSITION('/ ' IN category_raw) + 2)) - 1
           ELSE LENGTH(SUBSTRING(category_raw FROM POSITION('/ ' IN category_raw) + 2))
         END
       )) as category
     FROM store_products
     WHERE category_raw IS NOT NULL AND category_raw LIKE 'Shop / %'
     ORDER BY category`
  );

  return rows
    .map((r: Record<string, unknown>) => String(r.category))
    .filter((c: string) => c.length > 0 && c.length < 40);
}

export async function getProductList(options: {
  page?: number;
  perPage?: number;
  category?: string;
  search?: string;
}): Promise<{ products: ProductListItem[]; total: number }> {
  const { page = 1, perPage = 48, category, search } = options;
  const offset = (page - 1) * perPage;

  const conditions: string[] = [];
  const params: (string | number)[] = [];
  let paramIdx = 1;

  if (search && search.length >= 2) {
    conditions.push(`p.canonical_name ILIKE $${paramIdx++}`);
    params.push(`%${search}%`);
  }

  if (category) {
    conditions.push(`sp.category_raw ILIKE $${paramIdx++}`);
    params.push(`%${category}%`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countRow] = await rawSql(
    `SELECT COUNT(DISTINCT p.id) as total
     FROM products p
     JOIN product_matches pm ON pm.product_id = p.id
     JOIN store_products sp ON pm.store_product_id = sp.id
     ${whereClause}`,
    params
  );

  const rows = await rawSql(
    `SELECT p.id, p.canonical_name, p.brand, p.size, p.image_url,
            COUNT(DISTINCT sp.store_id) as store_count,
            MIN(COALESCE(sp.sale_price, sp.price)) as min_price,
            MAX(sp.category_raw) as category_raw
     FROM products p
     JOIN product_matches pm ON pm.product_id = p.id
     JOIN store_products sp ON pm.store_product_id = sp.id
     ${whereClause}
     GROUP BY p.id, p.canonical_name, p.brand, p.size, p.image_url
     ORDER BY COUNT(DISTINCT sp.store_id) DESC, p.canonical_name ASC
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, perPage, offset]
  );

  const products = rows.map((r: Record<string, unknown>) => ({
    id: Number(r.id),
    canonical_name: String(r.canonical_name),
    brand: r.brand as string | null,
    size: r.size as string | null,
    image_url: r.image_url as string | null,
    slug: productToSlug(String(r.canonical_name), Number(r.id)),
    store_count: Number(r.store_count),
    min_price: r.min_price != null ? Number(r.min_price) : null,
    category_raw: r.category_raw as string | null,
  }));

  return { products, total: Number(countRow.total) };
}
