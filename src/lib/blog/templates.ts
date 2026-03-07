import { formatKYD } from "@/lib/utils/currency";
import type {
  BlogArticle,
  WeeklyReportData,
  StoreComparisonData,
  CategorySpotlightData,
  PriceGap,
  PriceDrop,
} from "./types";

// ── Inline styles (Tailwind classes don't work in raw HTML strings) ───

const GREEN = "color: #047857; font-weight: 600;";
const GREEN_BG = "background: #ecfdf5; color: #047857; padding: 2px 8px; border-radius: 9999px; font-size: 0.8em; font-weight: 600;";
const RED = "color: #dc2626; font-weight: 600;";
const MUTED = "color: #6b7280; font-size: 0.85em;";
const TABULAR = "font-variant-numeric: tabular-nums;";

// ── Helpers ───────────────────────────────────────────────────────────

function gapRow(g: PriceGap): string {
  return `<tr>
    <td><a href="/prices/${g.productSlug}">${g.productName}</a></td>
    <td style="${TABULAR}"><span style="${GREEN}">${formatKYD(g.cheapestPrice)}</span> <span style="${MUTED}">${g.cheapestStore}</span></td>
    <td style="${TABULAR}">${formatKYD(g.expensivePrice)} <span style="${MUTED}">${g.expensiveStore}</span></td>
    <td style="${TABULAR}"><span style="${GREEN_BG}">${formatKYD(g.savings)} (${g.pctDiff}%)</span></td>
  </tr>`;
}

function dropRow(d: PriceDrop): string {
  return `<tr>
    <td><a href="/prices/${d.productSlug}">${d.productName}</a></td>
    <td>${d.storeName}</td>
    <td style="text-decoration: line-through; ${MUTED} ${TABULAR}">${formatKYD(d.oldPrice)}</td>
    <td style="${GREEN} ${TABULAR}">${formatKYD(d.newPrice)}</td>
    <td style="${TABULAR}"><span style="${GREEN_BG}">${formatKYD(d.dropAmount)} (${d.dropPct}% off)</span></td>
  </tr>`;
}

function toSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ── Weekly Price Report ───────────────────────────────────────────────

export function weeklyReport(data: WeeklyReportData): BlogArticle {
  const weekSlug = toSlug(data.weekOf);
  const cheapestStore = [...data.storeSummaries].sort((a, b) => b.winRate - a.winRate)[0];

  const content = `
<p>Every week, we crunch the numbers across <strong>${data.totalMatched.toLocaleString()} products</strong> matched by barcode across Cayman's grocery stores. Here's what we found for the week of ${data.weekOf}.</p>

<h2>Store Win Rates This Week</h2>
<p>Win rate = percentage of UPC-matched products where a store has the lowest price.</p>
<table>
  <thead><tr><th>Store</th><th>Products</th><th>Win Rate</th><th>Avg Price</th></tr></thead>
  <tbody>
    ${data.storeSummaries
      .sort((a, b) => b.winRate - a.winRate)
      .map(
        (s, i) =>
          `<tr><td><a href="/store/${s.storeId}">${s.storeName}</a></td><td>${s.matchedProducts.toLocaleString()}</td><td style="${i === 0 ? GREEN : ""} ${TABULAR}">${s.winRate}%</td><td style="${TABULAR}">${formatKYD(s.avgPrice)}</td></tr>`
      )
      .join("\n    ")}
  </tbody>
</table>

<h2>Biggest Price Gaps</h2>
<p>These products have the largest dollar difference between the cheapest and most expensive store.</p>
<table>
  <thead><tr><th>Product</th><th>Cheapest</th><th>Most Expensive</th><th>You Save</th></tr></thead>
  <tbody>
    ${data.topGaps.map(gapRow).join("\n    ")}
  </tbody>
</table>

${
  data.priceDrops.length > 0
    ? `<h2>Price Drops This Week</h2>
<p>These items dropped in price since last week.</p>
<table>
  <thead><tr><th>Product</th><th>Store</th><th>Was</th><th>Now</th><th>Savings</th></tr></thead>
  <tbody>
    ${data.priceDrops.map(dropRow).join("\n    ")}
  </tbody>
</table>`
    : ""
}

<h2>Best Categories to Compare</h2>
<p>Categories where shopping around pays off the most.</p>
<table>
  <thead><tr><th>Category</th><th>Products</th><th>Cheapest Store</th><th>Avg Savings</th></tr></thead>
  <tbody>
    ${data.categoryBreakdowns
      .sort((a, b) => b.avgSavings - a.avgSavings)
      .slice(0, 10)
      .map(
        (c) =>
          `<tr><td><a href="/category/${c.categorySlug}">${c.category}</a></td><td>${c.productCount}</td><td>${c.cheapestStore}</td><td style="${GREEN} ${TABULAR}">${formatKYD(c.avgSavings)}</td></tr>`
      )
      .join("\n    ")}
  </tbody>
</table>

<h2>Bottom Line</h2>
<p><strong>${cheapestStore.storeName}</strong> wins this week with a <strong>${cheapestStore.winRate}%</strong> win rate across matched products. But don't assume one store is always cheapest &mdash; use <a href="/compare">our comparison tool</a> to check the items you actually buy.</p>

<p><em>Data is based on ${data.totalMatched.toLocaleString()} barcode-matched products across ${data.storeSummaries.length} Cayman Islands grocery stores. Prices include sale prices when available. <a href="/prices">Browse all products</a>.</em></p>
`.trim();

  return {
    slug: `weekly-price-report-${weekSlug}`,
    title: `Weekly Grocery Price Report: ${data.weekOf}`,
    description: `Compare Cayman Islands grocery prices for the week of ${data.weekOf}. ${cheapestStore.storeName} leads with a ${cheapestStore.winRate}% win rate across ${data.totalMatched.toLocaleString()} products.`,
    content,
    category: "weekly-report",
    tags: ["weekly report", "price comparison", "cayman groceries"],
  };
}

// ── Biggest Price Gaps ────────────────────────────────────────────────

export function biggestPriceGaps(gaps: PriceGap[], date: string): BlogArticle {
  const dateSlug = toSlug(date);

  const content = `
<p>We compared prices across Cayman's grocery stores and found these products with the <strong>biggest price differences</strong>. Shopping at the right store for these items can save you serious money.</p>

<h2>Top ${gaps.length} Biggest Price Gaps</h2>
<table>
  <thead><tr><th>Product</th><th>Cheapest</th><th>Most Expensive</th><th>You Save</th></tr></thead>
  <tbody>
    ${gaps.map(gapRow).join("\n    ")}
  </tbody>
</table>

<h2>Key Takeaways</h2>
<ul>
  ${(() => {
    const storeWins: Record<string, number> = {};
    for (const g of gaps) {
      storeWins[g.cheapestStore] = (storeWins[g.cheapestStore] || 0) + 1;
    }
    return Object.entries(storeWins)
      .sort(([, a], [, b]) => b - a)
      .map(([store, count]) => `<li><strong>${store}</strong> is cheapest for ${count} of the top ${gaps.length} price gaps</li>`)
      .join("\n  ");
  })()}
  <li>The average savings across these items is <strong>${formatKYD(gaps.reduce((s, g) => s + g.savings, 0) / gaps.length)}</strong> per item</li>
  <li>The biggest single gap is <strong>${formatKYD(gaps[0]?.savings ?? 0)}</strong> on ${gaps[0]?.productName ?? "N/A"}</li>
</ul>

<p>Use our <a href="/compare">price comparison tool</a> to check any product, or <a href="/prices">browse all compared products</a>.</p>

<p><em>Prices as of ${date}. Based on UPC barcode matching across Cayman Islands stores.</em></p>
`.trim();

  return {
    slug: `biggest-price-gaps-cayman-groceries-${dateSlug}`,
    title: `The Biggest Price Gaps in Cayman Groceries (${date})`,
    description: `These Cayman grocery products have the biggest price differences between stores. Save up to ${formatKYD(gaps[0]?.savings ?? 0)} by shopping at the right store.`,
    content,
    category: "price-gaps",
    tags: ["price gaps", "savings", "cayman groceries"],
  };
}

// ── Store vs Store ────────────────────────────────────────────────────

export function storeComparison(data: StoreComparisonData): BlogArticle {
  const { storeA, storeB } = data;
  const slug = `${toSlug(storeA.storeName)}-vs-${toSlug(storeB.storeName)}-prices-cayman`;

  const aWinPct = data.totalCompared > 0
    ? Math.round((data.storeAWins.length / data.totalCompared) * 100)
    : 0;
  const bWinPct = 100 - aWinPct;
  const winner = aWinPct >= bWinPct ? storeA : storeB;
  const loser = winner === storeA ? storeB : storeA;
  const winnerPct = aWinPct >= bWinPct ? aWinPct : bWinPct;
  const loserPct = 100 - winnerPct;
  const winnerWins = aWinPct >= bWinPct ? data.storeAWins : data.storeBWins;
  const loserWins = aWinPct >= bWinPct ? data.storeBWins : data.storeAWins;

  const content = `
<p>We compared <strong>${data.totalCompared.toLocaleString()} products</strong> available at both <a href="/store/${storeA.storeId}">${storeA.storeName}</a> and <a href="/store/${storeB.storeId}">${storeB.storeName}</a> using UPC barcode matching. Here's the verdict.</p>

<h2>The Score</h2>
<table>
  <thead><tr><th>Metric</th><th>${storeA.storeName}</th><th>${storeB.storeName}</th></tr></thead>
  <tbody>
    <tr><td>Win Rate</td><td style="${aWinPct >= bWinPct ? GREEN : ""} ${TABULAR}">${aWinPct}%</td><td style="${bWinPct > aWinPct ? GREEN : ""} ${TABULAR}">${bWinPct}%</td></tr>
    <tr><td>Cheaper On</td><td>${data.storeAWins.length} items</td><td>${data.storeBWins.length} items</td></tr>
    <tr><td>Avg Price</td><td style="${TABULAR}">${formatKYD(storeA.avgPrice)}</td><td style="${TABULAR}">${formatKYD(storeB.avgPrice)}</td></tr>
    <tr><td>Total Products</td><td>${storeA.totalProducts.toLocaleString()}</td><td>${storeB.totalProducts.toLocaleString()}</td></tr>
  </tbody>
</table>

<h2>Where ${winner.storeName} Wins</h2>
<p>Products where ${winner.storeName} has the better price:</p>
<table>
  <thead><tr><th>Product</th><th>Cheapest</th><th>Other Store</th><th>Savings</th></tr></thead>
  <tbody>
    ${winnerWins.slice(0, 15).map(gapRow).join("\n    ")}
  </tbody>
</table>

<h2>Where ${loser.storeName} Wins</h2>
<p>But it's not one-sided. These products are cheaper at the other store:</p>
<table>
  <thead><tr><th>Product</th><th>Cheapest</th><th>Other Store</th><th>Savings</th></tr></thead>
  <tbody>
    ${loserWins.slice(0, 15).map(gapRow).join("\n    ")}
  </tbody>
</table>

<h2>Verdict</h2>
<p><strong>${winner.storeName}</strong> is cheaper on more items overall (${winnerPct}% vs ${loserPct}%), but ${loser.storeName} beats them on plenty of products. The best strategy? <a href="/compare">Compare prices</a> on the items you actually buy.</p>

<p><em>Based on ${data.totalCompared.toLocaleString()} UPC-matched products. Prices updated daily.</em></p>
`.trim();

  return {
    slug,
    title: `${storeA.storeName} vs ${storeB.storeName}: Cayman Grocery Price Comparison`,
    description: `We compared ${data.totalCompared.toLocaleString()} products at ${storeA.storeName} and ${storeB.storeName} in the Cayman Islands. ${winner.storeName} is cheaper ${winnerPct}% of the time.`,
    content,
    category: "store-comparison",
    tags: [storeA.storeName, storeB.storeName, "store comparison", "cayman groceries"],
  };
}

// ── Category Spotlight ────────────────────────────────────────────────

export function categorySpotlight(data: CategorySpotlightData): BlogArticle {
  const slug = `cheapest-${toSlug(data.category)}-cayman`;

  const content = `
<p>Looking for the best deals on <strong>${data.category}</strong> in the Cayman Islands? We compared <strong>${data.productCount} products</strong> across ${data.storeSummaries.length} stores to find where you'll pay the least.</p>

<h2>Store Comparison for ${data.category}</h2>
<table>
  <thead><tr><th>Store</th><th>Products Available</th><th>Average Price</th></tr></thead>
  <tbody>
    ${data.storeSummaries
      .sort((a, b) => a.avgPrice - b.avgPrice)
      .map(
        (s, i) =>
          `<tr><td>${s.storeName}</td><td>${s.productCount}</td><td style="${i === 0 ? GREEN : ""} ${TABULAR}">${formatKYD(s.avgPrice)}</td></tr>`
      )
      .join("\n    ")}
  </tbody>
</table>

<h2>Biggest Price Differences in ${data.category}</h2>
<table>
  <thead><tr><th>Product</th><th>Cheapest</th><th>Most Expensive</th><th>You Save</th></tr></thead>
  <tbody>
    ${data.topGaps.slice(0, 15).map(gapRow).join("\n    ")}
  </tbody>
</table>

<h2>Our Recommendation</h2>
<p>For <strong>${data.category}</strong>, <strong>${data.cheapestStore}</strong> tends to have the lowest prices overall. But individual items vary &mdash; check <a href="/category/${data.categorySlug}">all ${data.category} products</a> to compare specific items.</p>

<p><em>Based on ${data.productCount} products compared via UPC barcode matching. <a href="/prices">Browse all products</a>.</em></p>
`.trim();

  return {
    slug,
    title: `Cheapest ${data.category} in the Cayman Islands (2026)`,
    description: `Compare ${data.category} prices across Cayman grocery stores. ${data.cheapestStore} has the lowest average prices across ${data.productCount} products.`,
    content,
    category: "category-spotlight",
    tags: [data.category, "category comparison", "cayman groceries"],
  };
}
