import type { MetadataRoute } from "next";
import Database from "better-sqlite3";
import path from "path";
import { toSlug, productToSlug } from "@/lib/utils/slug";

const dbPath = path.join(process.cwd(), "data", "price-comp.db");

const STORE_IDS = ["fosters", "hurleys", "kirkmarket", "costuless", "pricedright"];

export default function sitemap(): MetadataRoute.Sitemap {
  const db = new Database(dbPath, { readonly: true });

  try {
    const baseUrl = "https://cheap.ky";

    // Static pages
    const staticPages: MetadataRoute.Sitemap = [
      { url: baseUrl, changeFrequency: "daily", priority: 1.0 },
      { url: `${baseUrl}/compare`, changeFrequency: "daily", priority: 0.9 },
      { url: `${baseUrl}/report`, changeFrequency: "weekly", priority: 0.9 },
      { url: `${baseUrl}/prices`, changeFrequency: "daily", priority: 0.9 },
      { url: `${baseUrl}/staples`, changeFrequency: "daily", priority: 0.8 },
      { url: `${baseUrl}/category`, changeFrequency: "weekly", priority: 0.7 },
    ];

    // Store pages
    const storePages: MetadataRoute.Sitemap = STORE_IDS.map((id) => ({
      url: `${baseUrl}/store/${id}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    // Product pages — only products with 2+ store matches (most valuable for comparison)
    const products = db
      .prepare(
        `
      SELECT p.id, p.canonical_name
      FROM products p
      JOIN product_matches pm ON pm.product_id = p.id
      JOIN store_products sp ON pm.store_product_id = sp.id
      WHERE COALESCE(sp.sale_price, sp.price) > 0
      GROUP BY p.id
      HAVING COUNT(DISTINCT sp.store_id) >= 2
      ORDER BY COUNT(DISTINCT sp.store_id) DESC, p.id
    `
      )
      .all() as Array<{ id: number; canonical_name: string }>;

    const productPages: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${baseUrl}/prices/${productToSlug(p.canonical_name, p.id)}`,
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));

    // Category pages
    const categories = db
      .prepare(
        `
      SELECT DISTINCT category_raw
      FROM store_products
      WHERE category_raw IS NOT NULL
      GROUP BY category_raw
      HAVING COUNT(*) >= 5
    `
      )
      .all() as Array<{ category_raw: string }>;

    const seenCategorySlugs = new Set<string>();
    const categoryPages: MetadataRoute.Sitemap = [];
    for (const cat of categories) {
      const parts = cat.category_raw.split(" / ");
      const label = parts.length > 2 ? parts.slice(2).join(" / ") : parts[parts.length - 1];
      const slug = toSlug(label);
      if (!slug || seenCategorySlugs.has(slug)) continue;
      seenCategorySlugs.add(slug);
      categoryPages.push({
        url: `${baseUrl}/category/${slug}`,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    return [...staticPages, ...storePages, ...categoryPages, ...productPages];
  } finally {
    db.close();
  }
}
