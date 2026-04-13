import type { MetadataRoute } from "next";
import { rawSql } from "@/lib/db";
import { toSlug, productToSlug } from "@/lib/utils/slug";
import { getBlogSlugs } from "@/lib/blog/data";

const BASE_URL = "https://cheap.ky";
const PRODUCTS_PER_SEGMENT = 5000;
const STORE_IDS = ["fosters", "hurleys", "kirkmarket", "costuless", "pricedright", "shopright"];

/**
 * Generate sitemap segment IDs.
 * id 0 = static/store/category/guide/blog pages
 * id 1..N = product pages in chunks of PRODUCTS_PER_SEGMENT
 */
export async function generateSitemaps() {
  const [row] = await rawSql(
    `SELECT COUNT(DISTINCT p.id) as cnt
     FROM products p
     JOIN product_matches pm ON pm.product_id = p.id
     JOIN store_products sp ON pm.store_product_id = sp.id
     WHERE COALESCE(sp.sale_price, sp.price) > 0`
  );

  const totalProducts = Number(row.cnt);
  const productSegments = Math.ceil(totalProducts / PRODUCTS_PER_SEGMENT);

  // id 0 = static pages, id 1..N = product segments
  return Array.from({ length: 1 + productSegments }, (_, i) => ({ id: i }));
}

export default async function sitemap({
  id: rawId,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  const id = Number(rawId);

  // ── Segment 0: static, store, category, guide, blog pages ──────────
  if (id === 0) {
    const staticPages: MetadataRoute.Sitemap = [
      { url: BASE_URL, changeFrequency: "daily", priority: 1.0 },
      { url: `${BASE_URL}/compare`, changeFrequency: "daily", priority: 0.9 },
      { url: `${BASE_URL}/report`, changeFrequency: "weekly", priority: 0.9 },
      { url: `${BASE_URL}/prices`, changeFrequency: "daily", priority: 0.9 },
      { url: `${BASE_URL}/staples`, changeFrequency: "daily", priority: 0.8 },
      { url: `${BASE_URL}/category`, changeFrequency: "weekly", priority: 0.7 },
      { url: `${BASE_URL}/blog`, changeFrequency: "daily", priority: 0.8 },
      { url: `${BASE_URL}/analytics`, changeFrequency: "daily", priority: 0.6 },
    ];

    const guidePages: MetadataRoute.Sitemap = [
      { url: `${BASE_URL}/guides/grocery-prices-cayman-islands-2026`, changeFrequency: "weekly", priority: 0.95 },
      { url: `${BASE_URL}/guides/cost-of-living-cayman-islands-2026`, changeFrequency: "weekly", priority: 0.95 },
      { url: `${BASE_URL}/guides/cheapest-grocery-store-cayman`, changeFrequency: "weekly", priority: 0.9 },
      { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.7 },
    ];

    const storePages: MetadataRoute.Sitemap = STORE_IDS.map((sid) => ({
      url: `${BASE_URL}/store/${sid}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    // Category pages with lastmod
    const categories = await rawSql(
      `SELECT sp.category_raw, MAX(sp.updated_at) as last_updated
       FROM store_products sp
       WHERE sp.category_raw IS NOT NULL
       GROUP BY sp.category_raw
       HAVING COUNT(*) >= 5`
    );

    const seenCategorySlugs = new Set<string>();
    const categoryPages: MetadataRoute.Sitemap = [];
    for (const cat of categories) {
      const parts = String(cat.category_raw).split(" / ");
      const label = parts.length > 2 ? parts.slice(2).join(" / ") : parts[parts.length - 1];
      const slug = toSlug(label);
      if (!slug || seenCategorySlugs.has(slug)) continue;
      seenCategorySlugs.add(slug);
      categoryPages.push({
        url: `${BASE_URL}/category/${slug}`,
        lastModified: cat.last_updated ? new Date(String(cat.last_updated)) : undefined,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    // Blog pages
    const blogSlugs = await getBlogSlugs();
    const blogPages: MetadataRoute.Sitemap = blogSlugs.map((slug) => ({
      url: `${BASE_URL}/blog/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    return [...staticPages, ...guidePages, ...storePages, ...categoryPages, ...blogPages];
  }

  // ── Segments 1..N: product pages ───────────────────────────────────
  const segmentIndex = id - 1;
  const offset = segmentIndex * PRODUCTS_PER_SEGMENT;

  if (Number.isNaN(offset) || offset < 0) return [];

  const products = await rawSql(
    `SELECT p.id, p.canonical_name, MAX(sp.updated_at) as last_updated
     FROM products p
     JOIN product_matches pm ON pm.product_id = p.id
     JOIN store_products sp ON pm.store_product_id = sp.id
     WHERE COALESCE(sp.sale_price, sp.price) > 0
     GROUP BY p.id, p.canonical_name
     ORDER BY p.id
     LIMIT $1 OFFSET $2`,
    [PRODUCTS_PER_SEGMENT, offset]
  );

  return products.map((p) => ({
    url: `${BASE_URL}/prices/${productToSlug(String(p.canonical_name), Number(p.id))}`,
    lastModified: p.last_updated ? new Date(String(p.last_updated)) : undefined,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));
}
