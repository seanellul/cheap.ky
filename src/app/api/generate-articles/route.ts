import { NextResponse } from "next/server";
import { taggedSql } from "@/lib/db";
import {
  getWeeklyReportData,
  getTopPriceGaps,
  getStoreComparisonData,
  getCategorySpotlightData,
  getCheapestStoreData,
} from "@/lib/blog/queries";
import {
  weeklyReport,
  biggestPriceGaps,
  storeComparison,
  categorySpotlight,
} from "@/lib/blog/templates";
import {
  cheapestStoreArticle,
  savingsTipsArticle,
  costOfLivingArticle,
} from "@/lib/blog/evergreen-templates";
import type { BlogArticle } from "@/lib/blog/types";

export const maxDuration = 60; // allow up to 60s (Pro plan) or 10s (Hobby)

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

async function upsertArticle(article: BlogArticle, dataSnapshot?: object): Promise<void> {
  // Merge FAQ data into the snapshot so it's available for FAQ schema at render time
  const snapshot: Record<string, unknown> = { ...dataSnapshot };
  if (article.faq && article.faq.length > 0) {
    snapshot.faq = article.faq;
  }
  const snapshotJson = Object.keys(snapshot).length > 0 ? JSON.stringify(snapshot) : null;

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
      ${snapshotJson}
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

/**
 * Generate blog articles from price data.
 *
 * Query params:
 *   ?type=weekly    - just the weekly report
 *   ?type=gaps      - just the price gaps article
 *   ?type=stores    - store vs store comparisons
 *   ?type=categories - category spotlights
 *   (no type)       - generate ALL articles
 */
export async function GET(request: Request) {
  // Verify cron secret — check both Vercel's cron header and manual Authorization header
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const vercelCronHeader = request.headers.get("x-vercel-cron-secret");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && vercelCronHeader !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type"); // weekly, gaps, stores, categories, evergreen, or null for all

  const results: string[] = [];

  try {
    // Weekly report
    if (!type || type === "weekly") {
      const reportData = await getWeeklyReportData();
      const report = weeklyReport(reportData);
      await upsertArticle(report, reportData);
      results.push(report.slug);
    }

    // Price gaps
    if (!type || type === "gaps") {
      const gaps = await getTopPriceGaps(30);
      const date = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const gapsArticle = biggestPriceGaps(gaps, date);
      await upsertArticle(gapsArticle, { gaps });
      results.push(gapsArticle.slug);
    }

    // Store comparisons
    if (!type || type === "stores") {
      for (const [a, b] of STORE_PAIRS) {
        try {
          const data = await getStoreComparisonData(a, b);
          if (!data.storeA || !data.storeB || data.totalCompared < 10) continue;
          const article = storeComparison(data);
          await upsertArticle(article, { storeIdA: a, storeIdB: b });
          results.push(article.slug);
        } catch {
          // skip failed pairs
        }
      }
    }

    // Category spotlights
    if (!type || type === "categories") {
      // Clean up junk category spotlight posts (e.g. "Shop" root category)
      await taggedSql`
        DELETE FROM blog_posts
        WHERE category = 'category-spotlight'
          AND slug IN ('cheapest-shop-cayman', 'cheapest-store-cayman', 'cheapest-home-cayman', 'cheapest-all-cayman', 'cheapest-products-cayman', 'cheapest-featured-cayman')
      `;

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
      for (const row of catRows as any[]) {
        try {
          const data = await getCategorySpotlightData(row.cat);
          if (!data || data.productCount < 5 || data.topGaps.length < 3) continue;
          const article = categorySpotlight(data);
          await upsertArticle(article);
          results.push(article.slug);
        } catch {
          // skip failed categories
        }
      }
    }

    // Evergreen articles
    if (!type || type === "evergreen") {
      const cheapestData = await getCheapestStoreData();
      const articles = [
        cheapestStoreArticle(cheapestData),
        savingsTipsArticle(cheapestData),
        costOfLivingArticle(cheapestData),
      ];
      for (const article of articles) {
        await upsertArticle(article);
        results.push(article.slug);
      }
    }

    return NextResponse.json({
      success: true,
      articlesGenerated: results.length,
      slugs: results,
    });
  } catch (error) {
    console.error("Article generation failed:", error);
    return NextResponse.json(
      { error: "Generation failed", details: String(error) },
      { status: 500 }
    );
  }
}
