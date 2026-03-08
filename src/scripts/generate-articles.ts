/**
 * Generate blog articles from price data.
 *
 * Usage:
 *   npx tsx src/scripts/generate-articles.ts           # generate all
 *   npx tsx src/scripts/generate-articles.ts weekly     # weekly report only
 *   npx tsx src/scripts/generate-articles.ts gaps       # price gaps only
 *   npx tsx src/scripts/generate-articles.ts stores     # store vs store comparisons
 *   npx tsx src/scripts/generate-articles.ts categories # category spotlights
 */

import { taggedSql } from "@/lib/db";
import {
  getWeeklyReportData,
  getTopPriceGaps,
  getStoreComparisonData,
  getCategorySpotlightData,
} from "@/lib/blog/queries";
import {
  weeklyReport,
  biggestPriceGaps,
  storeComparison,
  categorySpotlight,
} from "@/lib/blog/templates";
import type { BlogArticle } from "@/lib/blog/types";

const STORE_IDS = ["fosters", "hurleys", "kirkmarket", "costuless", "pricedright"];

// Store pairs for comparison articles
const STORE_PAIRS: [string, string][] = [
  ["fosters", "hurleys"],
  ["fosters", "costuless"],
  ["fosters", "pricedright"],
  ["hurleys", "costuless"],
  ["hurleys", "pricedright"],
  ["costuless", "pricedright"],
  ["fosters", "kirkmarket"],
  ["hurleys", "kirkmarket"],
  ["kirkmarket", "costuless"],
  ["kirkmarket", "pricedright"],
];

// Top categories for spotlight articles
const SPOTLIGHT_CATEGORIES = [
  "Dairy",
  "Frozen",
  "Snacks",
  "Beverages",
  "Meat & Seafood",
  "Bakery",
  "Pantry",
  "Household",
  "Health & Beauty",
  "Deli",
];

async function upsertArticle(article: BlogArticle, dataSnapshot?: object): Promise<void> {
  await taggedSql`
    INSERT INTO blog_posts (slug, title, description, content, category, tags, published_at, updated_at, data_snapshot)
    VALUES (
      ${article.slug},
      ${article.title},
      ${article.description},
      ${article.content},
      ${article.category},
      ${JSON.stringify(article.tags)},
      NOW(),
      NOW(),
      ${dataSnapshot ? JSON.stringify(dataSnapshot) : null}
    )
    ON CONFLICT (slug)
    DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      content = EXCLUDED.content,
      tags = EXCLUDED.tags,
      updated_at = NOW(),
      data_snapshot = EXCLUDED.data_snapshot
  `;
}

async function generateWeekly(): Promise<number> {
  console.log("Generating weekly report...");
  const data = await getWeeklyReportData();
  const article = weeklyReport(data);
  await upsertArticle(article, data);
  console.log(`  -> ${article.slug}`);
  return 1;
}

async function generateGaps(): Promise<number> {
  console.log("Generating price gaps article...");
  const gaps = await getTopPriceGaps(30);
  const date = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const article = biggestPriceGaps(gaps, date);
  await upsertArticle(article, { gaps });
  console.log(`  -> ${article.slug}`);
  return 1;
}

async function generateStoreComparisons(): Promise<number> {
  console.log("Generating store comparison articles...");
  let count = 0;
  for (const [a, b] of STORE_PAIRS) {
    try {
      const data = await getStoreComparisonData(a, b);
      if (!data.storeA || !data.storeB || data.totalCompared < 10) {
        console.log(`  -> Skipping ${a} vs ${b} (insufficient data)`);
        continue;
      }
      const article = storeComparison(data);
      await upsertArticle(article, { storeIdA: a, storeIdB: b });
      console.log(`  -> ${article.slug}`);
      count++;
    } catch (e) {
      console.error(`  -> Error generating ${a} vs ${b}:`, e);
    }
  }
  return count;
}

async function generateCategorySpotlights(): Promise<number> {
  console.log("Generating category spotlight articles...");

  // Get second-level categories from DB (e.g. "Shop / Dairy" -> "Dairy")
  const catRows = await taggedSql`
    SELECT cat, COUNT(*) AS cnt FROM (
      SELECT DISTINCT
        CASE
          WHEN POSITION(' / ' IN category_raw) > 0
          THEN SPLIT_PART(category_raw, ' / ', 2)
          ELSE SPLIT_PART(category_raw, ' / ', 1)
        END AS cat
      FROM store_products
      WHERE category_raw IS NOT NULL
        AND price IS NOT NULL
        AND category_raw NOT IN ('Shop')
    ) sub
    WHERE cat != '' AND cat != 'Shop'
    GROUP BY cat
    ORDER BY cat
  `;
  const dbCategories = (catRows as any[]).map((r: any) => r.cat).filter(Boolean);

  let count = 0;
  for (const cat of dbCategories) {
    try {
      const data = await getCategorySpotlightData(cat);
      if (!data || data.productCount < 5 || data.topGaps.length < 3) {
        continue;
      }
      const article = categorySpotlight(data);
      await upsertArticle(article);
      console.log(`  -> ${article.slug}`);
      count++;
    } catch (e) {
      console.error(`  -> Error generating spotlight for ${cat}:`, e);
    }
  }
  return count;
}

async function main() {
  const target = process.argv[2] || "all";

  console.log(`\nGenerating blog articles (${target})...\n`);

  let total = 0;

  if (target === "all" || target === "weekly") {
    total += await generateWeekly();
  }
  if (target === "all" || target === "gaps") {
    total += await generateGaps();
  }
  if (target === "all" || target === "stores") {
    total += await generateStoreComparisons();
  }
  if (target === "all" || target === "categories") {
    total += await generateCategorySpotlights();
  }

  console.log(`\nDone! Generated ${total} articles.\n`);
}

main().catch(console.error);
