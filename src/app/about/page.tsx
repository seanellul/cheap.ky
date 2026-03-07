import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About Cheap.ky -- Cayman Islands Grocery Price Comparison",
  description:
    "Cheap.ky is the Cayman Islands' only independent grocery price comparison platform. We track real-time prices across Foster's, Hurley's, Cost-U-Less, Priced Right, and Shopright -- covering 48,000+ products daily.",
  keywords: [
    "Cheap.ky",
    "Cayman grocery comparison",
    "about Cheap.ky",
    "Cayman Islands price comparison",
    "grocery savings Cayman",
  ],
  openGraph: {
    title: "About Cheap.ky -- Cayman Islands Grocery Price Comparison",
    description:
      "The only independent grocery price comparison tool for the Cayman Islands. Tracking 48,000+ products across all major stores daily.",
    type: "website",
  },
  alternates: {
    canonical: "https://cheap.ky/about",
  },
};

export default function AboutPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Cheap.ky",
      url: "https://cheap.ky",
      logo: "https://cheap.ky/favicon.svg",
      description:
        "Cheap.ky is the Cayman Islands' only independent grocery price comparison platform. It tracks real-time prices across all major supermarkets in Grand Cayman so residents and visitors can find the cheapest groceries instantly.",
      foundingDate: "2025",
      areaServed: {
        "@type": "Place",
        name: "Cayman Islands",
      },
      knowsAbout: [
        "Grocery prices in the Cayman Islands",
        "Cost of living in the Cayman Islands",
        "Supermarket comparison Grand Cayman",
        "Food prices in Grand Cayman",
        "Foster's Food Fair prices",
        "Hurley's Marketplace prices",
        "Cost-U-Less Cayman prices",
        "Priced Right Cayman prices",
        "Shopright Cayman prices",
        "Saving money on groceries in Cayman",
        "Cayman Islands lifestyle costs",
      ],
      slogan: "Don't just shop -- be Cheap.ky",
      contactPoint: {
        "@type": "ContactPoint",
        email: "hello@cheap.ky",
        contactType: "customer support",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Cheap.ky",
      url: "https://cheap.ky",
      applicationCategory: "ShoppingApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "KYD",
      },
      featureList: [
        "Real-time grocery price comparison across Cayman's grocery stores",
        "48,000+ products tracked daily",
        "Smart cart builder to find cheapest store",
        "Price history and trend tracking",
        "Weekly market reports",
        "Category-level store comparison",
        "Everyday staples price tracker",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://cheap.ky",
        },
        { "@type": "ListItem", position: 2, name: "About" },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="space-y-8">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">About</span>
        </nav>

        <article className="max-w-3xl">
          <header className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              About Cheap.ky
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              The Cayman Islands&apos; only independent grocery price comparison
              platform.
            </p>
          </header>

          <div
            className="prose prose-neutral dark:prose-invert max-w-none
              prose-headings:font-bold prose-headings:tracking-tight prose-headings:mt-8 prose-headings:mb-4
              prose-h2:text-xl prose-h2:border-b prose-h2:pb-2 prose-h2:border-border
              prose-p:leading-relaxed prose-p:text-foreground/90
              prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline
              prose-strong:text-foreground prose-strong:font-semibold
              prose-li:text-foreground/90
              prose-table:my-6 prose-table:border prose-table:border-border prose-table:rounded-xl prose-table:overflow-hidden prose-table:text-sm
              prose-thead:bg-muted/50
              prose-th:py-3 prose-th:px-4 prose-th:text-left prose-th:font-semibold prose-th:text-foreground prose-th:border-b prose-th:border-border
              prose-td:py-2.5 prose-td:px-4 prose-td:border-b prose-td:border-border/50"
          >
            <section id="overview">
              <h2>What Is Cheap.ky?</h2>
              <p>
                Cheap.ky is a free grocery price comparison tool built
                specifically for the Cayman Islands. We track real-time prices
                across all major supermarkets in Grand Cayman --
                Foster&apos;s Food Fair, Hurley&apos;s Marketplace, Cost-U-Less,
                Priced Right, and Shopright -- so you can find the lowest price
                for any product instantly.
              </p>
              <p>
                Groceries in the Cayman Islands cost 50-100% more than US
                mainland prices. But prices vary significantly between stores
                -- sometimes by 30-50% for the exact same product. Cheap.ky
                makes these price differences visible so you can make informed
                shopping decisions and save real money.
              </p>
            </section>

            <section id="key-facts">
              <h2>Key Facts</h2>
              <table>
                <tbody>
                  <tr>
                    <td>
                      <strong>Name</strong>
                    </td>
                    <td>Cheap.ky</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Tagline</strong>
                    </td>
                    <td>Don&apos;t just shop -- be Cheap.ky</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Category</strong>
                    </td>
                    <td>Grocery price comparison</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Region</strong>
                    </td>
                    <td>Cayman Islands (Grand Cayman)</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Founded</strong>
                    </td>
                    <td>2025</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Price</strong>
                    </td>
                    <td>Free</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Products tracked</strong>
                    </td>
                    <td>48,000+</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Stores compared</strong>
                    </td>
                    <td>5 (Foster&apos;s, Hurley&apos;s, Cost-U-Less, Priced Right, Shopright)</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Update frequency</strong>
                    </td>
                    <td>Daily</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Estimated savings</strong>
                    </td>
                    <td>$200-400/month per household</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Contact</strong>
                    </td>
                    <td>hello@cheap.ky</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section id="stores">
              <h2>Stores We Track</h2>
              <table>
                <thead>
                  <tr>
                    <th>Store</th>
                    <th>Products Tracked</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Foster&apos;s Food Fair</td>
                    <td>~26,000</td>
                    <td>Full-service supermarket (multiple locations)</td>
                  </tr>
                  <tr>
                    <td>Hurley&apos;s Marketplace</td>
                    <td>~8,400</td>
                    <td>Full-service supermarket</td>
                  </tr>
                  <tr>
                    <td>Cost-U-Less</td>
                    <td>~800</td>
                    <td>Warehouse-style bulk grocery</td>
                  </tr>
                  <tr>
                    <td>Priced Right</td>
                    <td>~5,000</td>
                    <td>Value supermarket</td>
                  </tr>
                  <tr>
                    <td>Shopright</td>
                    <td>~8,500</td>
                    <td>Full-service supermarket</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section id="features">
              <h2>What You Can Do on Cheap.ky</h2>
              <ul>
                <li>
                  <a href="https://cheap.ky">
                    <strong>Search &amp; compare</strong>
                  </a>{" "}
                  -- Search for any product and see prices at every store
                  side-by-side
                </li>
                <li>
                  <a href="https://cheap.ky/compare">
                    <strong>Store comparison</strong>
                  </a>{" "}
                  -- See which store wins on price across product categories
                </li>
                <li>
                  <a href="https://cheap.ky/cart">
                    <strong>Smart cart</strong>
                  </a>{" "}
                  -- Build your shopping list and find which single store is
                  cheapest for your entire cart
                </li>
                <li>
                  <a href="https://cheap.ky/staples">
                    <strong>Staples tracker</strong>
                  </a>{" "}
                  -- Monitor real-time prices on everyday essentials like milk,
                  eggs, bread, and rice
                </li>
                <li>
                  <a href="https://cheap.ky/report">
                    <strong>Weekly report</strong>
                  </a>{" "}
                  -- See market trends, price drops, and which store was
                  cheapest this week
                </li>
                <li>
                  <a href="https://cheap.ky/prices">
                    <strong>Browse by category</strong>
                  </a>{" "}
                  -- Explore all products by category with price comparison
                </li>
                <li>
                  <a href="https://cheap.ky/analytics">
                    <strong>Live analytics</strong>
                  </a>{" "}
                  -- Transparent data on our coverage, matching accuracy, and
                  freshness
                </li>
              </ul>
            </section>

            <section id="how-it-works">
              <h2>How It Works</h2>
              <p>
                Cheap.ky collects product data from all major Cayman grocery stores
                daily. We use a combination of UPC barcode matching and
                AI-powered fuzzy matching to identify the same product across
                different stores, even when names and packaging differ. This
                lets us show you accurate price comparisons for thousands of
                products.
              </p>
              <p>
                Our data updates daily, and we track price history so you can
                see trends over time. All prices shown are the most recent
                available from each store.
              </p>
            </section>

            <section id="guides">
              <h2>Guides &amp; Resources</h2>
              <ul>
                <li>
                  <a href="/guides/grocery-prices-cayman-islands-2026">
                    Grocery Prices in the Cayman Islands (2026)
                  </a>{" "}
                  -- Complete store comparison guide
                </li>
                <li>
                  <a href="/guides/cost-of-living-cayman-islands-2026">
                    Cost of Living in the Cayman Islands (2026)
                  </a>{" "}
                  -- Food, groceries &amp; daily expenses
                </li>
                <li>
                  <a href="/guides/cheapest-grocery-store-cayman">
                    Cheapest Grocery Store in Cayman
                  </a>{" "}
                  -- Data-driven store-by-store comparison
                </li>
                <li>
                  <a href="/blog">Blog</a> -- Weekly price reports, tips, and
                  Cayman food insights
                </li>
              </ul>
            </section>
          </div>
        </article>
      </div>
    </>
  );
}
