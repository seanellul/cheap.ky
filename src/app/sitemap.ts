import type { MetadataRoute } from "next";
import { rawSql } from "@/lib/db";
import { toSlug, productToSlug } from "@/lib/utils/slug";
import { getBlogSlugs } from "@/lib/blog/data";

const STORE_IDS = ["fosters", "hurleys", "kirkmarket", "costuless", "pricedright", "shopright"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://cheap.ky";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/compare`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/report`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/prices`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/staples`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/category`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/blog`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/analytics`, changeFrequency: "daily", priority: 0.6 },
  ];

  // AEO guide pages (high priority for AI answer engines)
  const guidePages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/guides/grocery-prices-cayman-islands-2026`, changeFrequency: "weekly", priority: 0.95 },
    { url: `${baseUrl}/guides/cost-of-living-cayman-islands-2026`, changeFrequency: "weekly", priority: 0.95 },
    { url: `${baseUrl}/guides/cheapest-grocery-store-cayman`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.7 },
  ];

  // Store pages
  const storePages: MetadataRoute.Sitemap = STORE_IDS.map((id) => ({
    url: `${baseUrl}/store/${id}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Product pages
  const products = await rawSql(
    `SELECT p.id, p.canonical_name
    FROM products p
    JOIN product_matches pm ON pm.product_id = p.id
    JOIN store_products sp ON pm.store_product_id = sp.id
    WHERE COALESCE(sp.sale_price, sp.price) > 0
    GROUP BY p.id, p.canonical_name
    HAVING COUNT(DISTINCT sp.store_id) >= 2
    ORDER BY COUNT(DISTINCT sp.store_id) DESC, p.id`
  );

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${baseUrl}/prices/${productToSlug(String(p.canonical_name), Number(p.id))}`,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  // Category pages
  const categories = await rawSql(
    `SELECT DISTINCT category_raw
    FROM store_products
    WHERE category_raw IS NOT NULL
    GROUP BY category_raw
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
      url: `${baseUrl}/category/${slug}`,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Blog posts
  const blogSlugs = await getBlogSlugs();
  const blogPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/blog`, changeFrequency: "daily", priority: 0.8 },
    ...blogSlugs.map((slug) => ({
      url: `${baseUrl}/blog/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];

  return [...staticPages, ...guidePages, ...storePages, ...categoryPages, ...productPages, ...blogPages];
}
