import { NextResponse } from "next/server";
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

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  try {
    // Weekly report
    const reportData = await getWeeklyReportData();
    const report = weeklyReport(reportData);
    await upsertArticle(report, reportData);
    results.push(report.slug);

    // Price gaps
    const gaps = await getTopPriceGaps(30);
    const date = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const gapsArticle = biggestPriceGaps(gaps, date);
    await upsertArticle(gapsArticle, { gaps });
    results.push(gapsArticle.slug);

    // Store comparisons
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

    // Category spotlights
    const catRows = await taggedSql`
      SELECT DISTINCT SPLIT_PART(category_raw, ' / ', 1) AS cat
      FROM store_products
      WHERE category_raw IS NOT NULL AND price IS NOT NULL
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
