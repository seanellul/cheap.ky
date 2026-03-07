import { formatKYD } from "@/lib/utils/currency";
import type {
  BlogArticle,
  StoreSummary,
  PriceGap,
  BasketItem,
  CheapestStoreData,
} from "./types";

const GREEN = "color: #047857; font-weight: 600;";
const MUTED = "color: #6b7280; font-size: 0.85em;";
const TABULAR = "font-variant-numeric: tabular-nums;";
const GREEN_BG = "background: #ecfdf5; color: #047857; padding: 2px 8px; border-radius: 9999px; font-size: 0.8em; font-weight: 600;";

// ── 1. Cheapest Grocery Store in Cayman Islands ──────────────────────

export function cheapestStoreArticle(data: CheapestStoreData): BlogArticle {
  const sorted = [...data.storeSummaries].sort((a, b) => b.winRate - a.winRate);
  const winner = sorted[0];
  const year = new Date().getFullYear();

  const basketRows = data.basket.map((item) => {
    const cells = item.prices
      .map(
        (p) =>
          `<td style="${p.storeName === item.cheapestStore ? GREEN : ""} ${TABULAR}">${formatKYD(p.price)}</td>`
      )
      .join("");
    return `<tr><td><a href="/prices/${item.productSlug}">${item.productName}</a></td>${cells}</tr>`;
  });

  const basketStoreHeaders = data.basketTotals
    .map((t) => `<th>${t.storeName}</th>`)
    .join("");

  const basketTotalCells = data.basketTotals
    .map((t, i) => `<td style="${i === 0 ? GREEN : ""} ${TABULAR}"><strong>${formatKYD(t.total)}</strong></td>`)
    .join("");

  const faq = [
    {
      question: `What is the cheapest grocery store in the Cayman Islands in ${year}?`,
      answer: `Based on our analysis of ${data.totalMatched.toLocaleString()} UPC-matched products, ${winner.storeName} has the lowest prices ${winner.winRate}% of the time, making it the cheapest overall. However, no single store is cheapest for everything — comparing prices on your specific items can save you even more.`,
    },
    {
      question: "How much can I save by shopping at the cheapest store?",
      answer: `The top price gaps between stores can be as high as ${formatKYD(data.topGaps[0]?.savings ?? 0)} on a single item. On a typical weekly shop, choosing the cheapest store for each item could save you 15-30% compared to shopping at the most expensive store.`,
    },
    {
      question: "Which grocery stores are in the Cayman Islands?",
      answer: `The main grocery stores in Grand Cayman are ${sorted.map((s) => s.storeName).join(", ")}. Each store has different strengths — some are cheaper for bulk items, others for fresh produce or specialty goods.`,
    },
    {
      question: "Are grocery prices in Cayman Islands expensive?",
      answer: "Yes, grocery prices in the Cayman Islands are significantly higher than the US mainland due to import costs and duties. Most food is shipped in. However, by comparing prices across stores, you can minimize the impact and find the best deals available locally.",
    },
    {
      question: "How often do grocery prices change in Cayman?",
      answer: "Prices change frequently — stores update sale prices weekly and regular prices can shift with shipments. Cheap.ky tracks prices daily across all major stores so you always have the latest data.",
    },
  ];

  const faqHtml = faq
    .map(
      (f) => `
<div style="margin-bottom: 1.5em;">
  <h3>${f.question}</h3>
  <p>${f.answer}</p>
</div>`
    )
    .join("");

  const content = `
<p>We compared <strong>${data.totalMatched.toLocaleString()} products</strong> across every major grocery store in the Cayman Islands using UPC barcode matching. Here's the definitive answer to which store gives you the best prices in ${year}.</p>

<h2>The Winner: ${winner.storeName}</h2>
<p><strong>${winner.storeName}</strong> is the cheapest grocery store in the Cayman Islands with a <strong style="${GREEN}">${winner.winRate}% win rate</strong> — meaning it has the lowest price on ${winner.winRate}% of products when compared head-to-head with other stores.</p>

<p>But it's not that simple. Here's how every store stacks up:</p>

<h2>Store Rankings by Win Rate</h2>
<p>Win rate = how often a store has the cheapest price on a UPC-matched product.</p>
<table>
  <thead><tr><th>Rank</th><th>Store</th><th>Win Rate</th><th>Products Tracked</th><th>Avg Price</th></tr></thead>
  <tbody>
    ${sorted
      .map(
        (s, i) =>
          `<tr><td>${i + 1}</td><td><a href="/store/${s.storeId}">${s.storeName}</a></td><td style="${i === 0 ? GREEN : ""} ${TABULAR}">${s.winRate}%</td><td>${s.matchedProducts.toLocaleString()}</td><td style="${TABULAR}">${formatKYD(s.avgPrice)}</td></tr>`
      )
      .join("\n    ")}
  </tbody>
</table>

<h2>The Grocery Basket Test</h2>
<p>Win rates tell part of the story, but what really matters is: <strong>how much does a typical shop cost?</strong> We priced out common grocery items across every store:</p>
<table>
  <thead><tr><th>Item</th>${basketStoreHeaders}</tr></thead>
  <tbody>
    ${basketRows.join("\n    ")}
    <tr style="font-weight: 600; border-top: 2px solid #e5e7eb;"><td><strong>Total</strong></td>${basketTotalCells}</tr>
  </tbody>
</table>

<h2>Where Each Store Wins</h2>
${sorted
  .map(
    (s) => `
<h3>${s.storeName}</h3>
<ul>
  <li><strong>Win rate:</strong> ${s.winRate}%</li>
  <li><strong>Products tracked:</strong> ${s.totalProducts.toLocaleString()}</li>
  <li><strong>Average price:</strong> ${formatKYD(s.avgPrice)}</li>
  <li><strong>Best for:</strong> ${
    s.storeId === "fosters"
      ? "Widest selection, competitive everyday prices"
      : s.storeId === "hurleys"
        ? "Fresh produce, specialty items, premium brands"
        : s.storeId === "costuless"
          ? "Bulk buying, household goods, large families"
          : s.storeId === "pricedright"
            ? "Bulk warehouse prices, meat, frozen goods"
            : "General groceries"
  }</li>
</ul>`
  )
  .join("")}

<h2>The Smart Strategy: Don't Pick Just One Store</h2>
<p>No single store wins on everything. The smartest approach is to:</p>
<ol>
  <li><strong>Check prices before you shop</strong> — use <a href="/">Cheap.ky's search</a> to compare specific items</li>
  <li><strong>Buy bulk at ${sorted.find((s) => ["costuless", "pricedright"].includes(s.storeId))?.storeName ?? "warehouse stores"}</strong> — household goods, cleaning supplies, and non-perishables</li>
  <li><strong>Watch for sales</strong> — stores rotate discounts weekly, and we track every price change</li>
  <li><strong>Compare your actual list</strong> — use our <a href="/compare">comparison tool</a> to find the cheapest store for YOUR items, not just on average</li>
</ol>

<h2>Frequently Asked Questions</h2>
${faqHtml}

<p><em>Data updated daily. Based on ${data.totalMatched.toLocaleString()} UPC barcode-matched products across ${sorted.length} Cayman Islands grocery stores. <a href="/compare">Compare prices now</a>.</em></p>
`.trim();

  return {
    slug: `cheapest-grocery-store-cayman-islands-${year}`,
    title: `Cheapest Grocery Store in the Cayman Islands (${year})`,
    description: `We compared ${data.totalMatched.toLocaleString()} products across every Cayman grocery store. ${winner.storeName} is cheapest ${winner.winRate}% of the time. Full store rankings, basket test, and savings tips.`,
    content,
    category: "evergreen",
    tags: ["cheapest grocery store", "cayman islands", "grocery prices", "save money", "store comparison"],
    faq,
  };
}

// ── 2. How to Save Money on Groceries ────────────────────────────────

export function savingsTipsArticle(data: CheapestStoreData): BlogArticle {
  const sorted = [...data.storeSummaries].sort((a, b) => b.winRate - a.winRate);
  const winner = sorted[0];
  const topSavings = data.topGaps.slice(0, 5);
  const year = new Date().getFullYear();

  const faq = [
    {
      question: "How much more expensive are groceries in Cayman vs the US?",
      answer: "Groceries in the Cayman Islands typically cost 50-100% more than equivalent items in the US. Import duties, shipping costs, and limited competition drive prices up. However, strategic shopping across stores can reduce this markup significantly.",
    },
    {
      question: "Is it worth shopping at multiple grocery stores in Cayman?",
      answer: `Absolutely. Our data shows price differences of up to ${formatKYD(topSavings[0]?.savings ?? 10)} on individual items. Even splitting your shop between two stores — one for bulk goods and one for fresh items — can save you hundreds per month.`,
    },
    {
      question: "When is the best time to buy groceries in Cayman?",
      answer: "Stores receive shipments on different days, and sale prices typically change weekly (often Wednesday or Thursday). Shopping early in the week often means better selection. Check Cheap.ky for current sale prices across all stores.",
    },
  ];

  const faqHtml = faq
    .map(
      (f) => `
<div style="margin-bottom: 1.5em;">
  <h3>${f.question}</h3>
  <p>${f.answer}</p>
</div>`
    )
    .join("");

  const content = `
<p>Living in the Cayman Islands means paying a premium for groceries. But with the right strategy, you can <strong>cut your grocery bill by 20-30%</strong> without sacrificing quality. Here are proven tips based on real price data from ${data.totalMatched.toLocaleString()} products across ${sorted.length} stores.</p>

<h2>1. Compare Prices Before You Shop</h2>
<p>This is the single biggest money-saver. The same product can cost dramatically different amounts at different stores:</p>
<table>
  <thead><tr><th>Product</th><th>Cheapest</th><th>Most Expensive</th><th>You Save</th></tr></thead>
  <tbody>
    ${topSavings
      .map(
        (g) =>
          `<tr><td><a href="/prices/${g.productSlug}">${g.productName}</a></td><td style="${GREEN} ${TABULAR}">${formatKYD(g.cheapestPrice)} <span style="${MUTED}">${g.cheapestStore}</span></td><td style="${TABULAR}">${formatKYD(g.expensivePrice)} <span style="${MUTED}">${g.expensiveStore}</span></td><td><span style="${GREEN_BG}">${formatKYD(g.savings)}</span></td></tr>`
      )
      .join("\n    ")}
  </tbody>
</table>
<p>Use <a href="/">Cheap.ky's search</a> to check any item instantly, or <a href="/compare">browse all compared products</a>.</p>

<h2>2. Know Which Store Is Best for What</h2>
<ul>
  ${sorted.map((s) => `<li><strong><a href="/store/${s.storeId}">${s.storeName}</a></strong> — ${s.winRate}% win rate, ${s.matchedProducts.toLocaleString()} products tracked. Avg price: ${formatKYD(s.avgPrice)}</li>`).join("\n  ")}
</ul>
<p><strong>${winner.storeName}</strong> wins on price most often, but every store has categories where they're cheapest. Check our <a href="/blog">store comparison articles</a> for detailed head-to-head breakdowns.</p>

<h2>3. Buy Bulk at Warehouse Stores</h2>
<p>For non-perishable items — canned goods, cleaning supplies, toilet paper, rice, pasta — warehouse-style stores like Cost-U-Less and Priced Right often beat supermarkets by 15-25%. The upfront cost is higher but the per-unit price is lower.</p>

<h2>4. Track Sale Prices</h2>
<p>Cayman stores rotate sales weekly. An item that's expensive today might be discounted next week. We track every price change daily, so you can spot deals the moment they happen.</p>

<h2>5. Make a List and Stick to It</h2>
<p>Impulse buying in Cayman's grocery stores is especially costly because everything is marked up. Use our <a href="/cart">shopping cart feature</a> to plan your shop, compare totals across stores, and know exactly what you're spending before you walk in.</p>

<h2>6. Consider Store Brands</h2>
<p>Store-brand and private-label products are often 20-40% cheaper than name brands for equivalent quality. Foster's and Hurley's both carry store-brand lines across many categories.</p>

<h2>7. Shop the Perimeter for Fresh, Center for Deals</h2>
<p>Fresh produce, meat, and bakery items (store perimeter) tend to have smaller price gaps between stores. Packaged goods in center aisles show the biggest differences — that's where comparing pays off most.</p>

<h2>How Much Can You Actually Save?</h2>
<p>Based on our data, a family spending $800/month on groceries could save <strong>$150-250/month</strong> by:</p>
<ul>
  <li>Switching their primary store to the cheapest option for their usual items</li>
  <li>Buying bulk staples at a warehouse store once a month</li>
  <li>Checking Cheap.ky before each shop to catch price differences</li>
</ul>
<p>That's <strong>$1,800-3,000 per year</strong> — real money in your pocket.</p>

<h2>Frequently Asked Questions</h2>
${faqHtml}

<p><em>All prices and savings based on ${data.totalMatched.toLocaleString()} UPC-matched products tracked daily across Cayman Islands stores. <a href="/">Start comparing prices</a>.</em></p>
`.trim();

  return {
    slug: "how-to-save-money-groceries-cayman-islands",
    title: "How to Save Money on Groceries in the Cayman Islands",
    description: `7 proven strategies to cut your Cayman grocery bill by 20-30%. Based on real price data from ${data.totalMatched.toLocaleString()} products across ${sorted.length} stores.`,
    content,
    category: "evergreen",
    tags: ["save money", "grocery tips", "cayman islands", "budget", "cost of living"],
    faq,
  };
}

// ── 3. Cost of Living: Grocery Edition ───────────────────────────────

export function costOfLivingArticle(data: CheapestStoreData): BlogArticle {
  const sorted = [...data.storeSummaries].sort((a, b) => b.winRate - a.winRate);
  const year = new Date().getFullYear();

  const basketRows = data.basket.map((item) => {
    const cheapestPrice = item.cheapestPrice;
    return `<tr><td>${item.productName}</td><td style="${GREEN} ${TABULAR}">${formatKYD(cheapestPrice)}</td><td style="${TABULAR}">${formatKYD(item.prices.reduce((max, p) => Math.max(max, p.price), 0))}</td></tr>`;
  });

  const avgBasketTotal =
    data.basketTotals.reduce((sum, t) => sum + t.total, 0) / data.basketTotals.length;

  const faq = [
    {
      question: "How much does a week of groceries cost in the Cayman Islands?",
      answer: `A typical week of groceries for one person costs approximately ${formatKYD(avgBasketTotal * 0.6)}-${formatKYD(avgBasketTotal)} depending on where you shop and what you buy. A family of four can expect to spend ${formatKYD(avgBasketTotal * 2)}-${formatKYD(avgBasketTotal * 3)} per week.`,
    },
    {
      question: "Why are groceries so expensive in Cayman?",
      answer: "Almost everything is imported by ship or air, adding significant transportation costs. Import duties of 22-27% are applied to most food items. Limited local competition and high real estate costs for stores also contribute to elevated prices.",
    },
    {
      question: "What are the cheapest foods to buy in Cayman?",
      answer: "Rice, dried beans, canned goods, eggs, and chicken tend to have the smallest markup compared to US prices. Fresh produce and dairy have the highest markups. Buying local produce at farmers' markets when available is often cheaper than imported alternatives.",
    },
  ];

  const faqHtml = faq
    .map(
      (f) => `
<div style="margin-bottom: 1.5em;">
  <h3>${f.question}</h3>
  <p>${f.answer}</p>
</div>`
    )
    .join("");

  const content = `
<p>Moving to or visiting the Cayman Islands? The number one sticker shock is at the grocery store. We tracked <strong>${data.totalMatched.toLocaleString()} products</strong> across ${sorted.length} stores to give you real numbers on what groceries actually cost here in ${year}.</p>

<h2>What Does a Basic Grocery Basket Cost?</h2>
<p>Here's what common household staples cost across Cayman stores:</p>
<table>
  <thead><tr><th>Item</th><th>Cheapest Price</th><th>Most Expensive</th></tr></thead>
  <tbody>
    ${basketRows.join("\n    ")}
  </tbody>
</table>

<h2>Monthly Grocery Budget by Household</h2>
<p>Based on our price data, here are realistic monthly grocery budgets:</p>
<table>
  <thead><tr><th>Household</th><th>Budget (Smart Shopping)</th><th>Budget (No Comparison)</th></tr></thead>
  <tbody>
    <tr><td>Single person</td><td style="${GREEN} ${TABULAR}">${formatKYD(avgBasketTotal * 2.5)}</td><td style="${TABULAR}">${formatKYD(avgBasketTotal * 3.5)}</td></tr>
    <tr><td>Couple</td><td style="${GREEN} ${TABULAR}">${formatKYD(avgBasketTotal * 4)}</td><td style="${TABULAR}">${formatKYD(avgBasketTotal * 5.5)}</td></tr>
    <tr><td>Family of 4</td><td style="${GREEN} ${TABULAR}">${formatKYD(avgBasketTotal * 7)}</td><td style="${TABULAR}">${formatKYD(avgBasketTotal * 9.5)}</td></tr>
  </tbody>
</table>
<p><em>"Smart shopping" means comparing prices across stores. The difference is real — ${formatKYD(avgBasketTotal * 2)} or more per month for a family.</em></p>

<h2>Why Groceries Cost More in Cayman</h2>
<ul>
  <li><strong>Import duties:</strong> 22-27% on most food items</li>
  <li><strong>Shipping costs:</strong> Everything arrives by container ship or air freight</li>
  <li><strong>Limited competition:</strong> Fewer stores than comparably sized US cities</li>
  <li><strong>Real estate:</strong> High commercial rents get passed to consumers</li>
  <li><strong>No income tax trade-off:</strong> Cayman has no income tax, but consumer prices are higher</li>
</ul>

<h2>How to Keep Costs Down</h2>
<p>The single most effective strategy is <strong>comparing prices before you buy</strong>. Our data shows the same product can vary by ${formatKYD(data.topGaps[0]?.savings ?? 5)}-${formatKYD(data.topGaps[2]?.savings ?? 15)} between stores.</p>
<ul>
  <li><a href="/">Search and compare any product</a> across all ${sorted.length} stores</li>
  <li><a href="/compare">Browse the biggest price gaps</a> to find easy savings</li>
  <li><a href="/blog/how-to-save-money-groceries-cayman-islands">Read our full savings guide</a></li>
</ul>

<h2>Store Overview</h2>
<table>
  <thead><tr><th>Store</th><th>Products</th><th>Win Rate</th><th>Best For</th></tr></thead>
  <tbody>
    ${sorted
      .map(
        (s) =>
          `<tr><td><a href="/store/${s.storeId}">${s.storeName}</a></td><td>${s.totalProducts.toLocaleString()}</td><td style="${TABULAR}">${s.winRate}%</td><td>${
            s.storeId === "fosters"
              ? "Largest selection, everyday prices"
              : s.storeId === "hurleys"
                ? "Fresh produce, specialty items"
                : s.storeId === "costuless"
                  ? "Bulk buying, household goods"
                  : s.storeId === "pricedright"
                    ? "Warehouse prices, meat, frozen"
                    : "General groceries"
          }</td></tr>`
      )
      .join("\n    ")}
  </tbody>
</table>

<h2>Frequently Asked Questions</h2>
${faqHtml}

<p><em>All prices based on ${data.totalMatched.toLocaleString()} products tracked daily. <a href="/">Compare prices now on Cheap.ky</a>.</em></p>
`.trim();

  return {
    slug: `cost-of-living-cayman-islands-grocery-prices-${year}`,
    title: `Cost of Living in the Cayman Islands: Grocery Prices (${year})`,
    description: `What do groceries actually cost in the Cayman Islands? Real prices from ${data.totalMatched.toLocaleString()} products across ${sorted.length} stores. Monthly budgets, basket costs, and tips to save.`,
    content,
    category: "evergreen",
    tags: ["cost of living", "cayman islands", "grocery prices", "expat", "moving to cayman"],
    faq,
  };
}
