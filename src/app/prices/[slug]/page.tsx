export const revalidate = 3600;

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getProductBySlug,
  getRelatedProducts,
  getProductSlugs,
  transformHistoryForChart,
} from "@/lib/data/products";
import { PriceChartWrapper } from "@/components/price-chart-wrapper";
import { formatKYD } from "@/lib/utils/currency";
import { productToSlug, toSlug } from "@/lib/utils/slug";
import { ChevronRight, ExternalLink, TrendingDown, Tag, Store, BarChart3 } from "lucide-react";
import { ProductRating } from "@/components/product-rating";

// ── Constants ──────────────────────────────────────────────────────────

const STORE_NAMES: Record<string, string> = {
  fosters: "Foster's Food Fair",
  hurleys: "Hurley's Marketplace",
  kirkmarket: "Kirk Market",
  costuless: "Cost-U-Less",
  pricedright: "Priced Right",
};

const STORE_SHORT_NAMES: Record<string, string> = {
  fosters: "Foster's",
  hurleys: "Hurley's",
  kirkmarket: "Kirk Mkt",
  costuless: "Cost-U-Less",
  pricedright: "Priced Right",
};

const STORE_COLORS: Record<string, string> = {
  fosters: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  hurleys: "bg-red-500/10 text-red-700 dark:text-red-400",
  kirkmarket: "bg-green-500/10 text-green-700 dark:text-green-400",
  costuless: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  pricedright: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
};

// ── Types ──────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ── Metadata ───────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProductBySlug(slug);
  if (!data) return { title: "Product Not Found" };

  const { product, storePrices } = data;

  let cheapestPrice = Infinity;
  let cheapestStore = "";
  for (const sp of storePrices) {
    const effective = sp.sale_price ?? sp.price;
    if (effective != null && effective < cheapestPrice) {
      cheapestPrice = effective;
      cheapestStore = STORE_NAMES[sp.store_id] ?? sp.store_id;
    }
  }

  const brandPrefix = product.brand && !product.canonical_name.toLowerCase().includes(product.brand.toLowerCase())
    ? product.brand
    : null;
  const sizeSuffix = product.size && !product.canonical_name.toLowerCase().includes(product.size.toLowerCase())
    ? product.size
    : null;
  const richName = [brandPrefix, product.canonical_name, sizeSuffix].filter(Boolean).join(" ");
  const title = `${richName} Price in Cayman Islands`;
  const description =
    storePrices.length > 0
      ? `Compare ${product.canonical_name} prices across ${storePrices.length} Cayman store${storePrices.length === 1 ? "" : "s"}. Currently cheapest at ${cheapestStore} (${formatKYD(cheapestPrice)}). Updated daily.`
      : `Find the best price for ${product.canonical_name} in the Cayman Islands.`;

  return {
    title,
    description,
    alternates: { canonical: `https://cheap.ky/prices/${slug}` },
    openGraph: {
      title: `${product.canonical_name} -- Best Price in Cayman`,
      description,
      images: product.image_url ? [product.image_url] : [],
    },
  };
}

// ── Static params ─────────────────────────────────────────────────────
// Return empty array so pages are generated on-demand via ISR (revalidate = 3600)
// instead of building all 41k+ pages at deploy time.
export async function generateStaticParams() {
  return [];
}

// ── Page ───────────────────────────────────────────────────────────────

export default async function ProductPricePage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getProductBySlug(slug);
  if (!data) notFound();

  const { product, storePrices, history, categoryRaw, ratings } = data;

  // Compute cheapest store
  let cheapestPrice = Infinity;
  let cheapestStoreId = "";
  for (const sp of storePrices) {
    const effective = sp.sale_price ?? sp.price;
    if (effective != null && effective < cheapestPrice) {
      cheapestPrice = effective;
      cheapestStoreId = sp.store_id;
    }
  }

  // Compute most expensive for savings display
  let mostExpensivePrice = 0;
  for (const sp of storePrices) {
    const effective = sp.sale_price ?? sp.price;
    if (effective != null && effective > mostExpensivePrice) {
      mostExpensivePrice = effective;
    }
  }
  const savings = mostExpensivePrice - cheapestPrice;

  // Sort store prices: cheapest first
  const sortedPrices = [...storePrices].sort((a, b) => {
    const priceA = a.sale_price ?? a.price ?? Infinity;
    const priceB = b.sale_price ?? b.price ?? Infinity;
    return priceA - priceB;
  });

  // Category breadcrumb
  const categoryParts = categoryRaw
    ? categoryRaw
        .split("/")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const topCategory = categoryParts.length >= 2 ? categoryParts[1] : null;

  // Related products
  const related = await getRelatedProducts(product.id, categoryRaw, 8);

  // Price history
  const hasHistory = history.length > 0;
  const { data: chartData, storeIds: chartStoreIds } =
    transformHistoryForChart(history);

  // Best image: prefer product-level, fall back to first store product image
  const displayImage =
    product.image_url || storePrices.find((sp) => sp.image_url)?.image_url;

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.canonical_name,
    image: displayImage,
    ...(product.brand
      ? { brand: { "@type": "Brand", name: product.brand } }
      : {}),
    ...(product.upc ? { sku: product.upc } : {}),
    offers: sortedPrices.map((sp) => ({
      "@type": "Offer",
      seller: {
        "@type": "Organization",
        name: STORE_NAMES[sp.store_id] ?? sp.store_id,
      },
      price: sp.sale_price ?? sp.price,
      priceCurrency: "KYD",
      availability: "https://schema.org/InStock",
      ...(sp.source_url ? { url: sp.source_url } : {}),
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://cheap.ky" },
      { "@type": "ListItem", position: 2, name: "Prices", item: "https://cheap.ky/prices" },
      ...(topCategory
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: topCategory,
              item: `https://cheap.ky/category/${toSlug(topCategory)}`,
            },
            { "@type": "ListItem", position: 4, name: product.canonical_name },
          ]
        : [{ "@type": "ListItem", position: 3, name: product.canonical_name }]),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="space-y-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/prices" className="hover:text-primary transition-colors">
            Prices
          </Link>
          {topCategory && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link
                href={`/category/${toSlug(topCategory)}`}
                className="hover:text-primary transition-colors"
              >
                {topCategory}
              </Link>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium truncate max-w-[200px]">
            {product.canonical_name}
          </span>
        </nav>

        {/* Product header */}
        <div className="flex flex-col sm:flex-row gap-6">
          {displayImage && (
            <div className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayImage}
                alt={product.canonical_name}
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl object-cover bg-muted"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {product.canonical_name}
            </h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {product.brand && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  {product.brand}
                </span>
              )}
              {product.size && (
                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {product.size}
                </span>
              )}
              {product.upc && (
                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  UPC: {product.upc}
                </span>
              )}
            </div>

            {/* Best price callout */}
            {cheapestStoreId && cheapestPrice < Infinity && (
              <div className="mt-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <TrendingDown className="h-5 w-5" />
                  <span className="font-semibold text-sm">Best Price</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                    {formatKYD(cheapestPrice)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    at {STORE_NAMES[cheapestStoreId] ?? cheapestStoreId}
                  </span>
                </div>
                {savings > 0.01 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Save {formatKYD(savings)} vs. most expensive option
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Price comparison table */}
        {sortedPrices.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Store className="h-5 w-5 text-muted-foreground" />
              Price Comparison
            </h2>
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="py-2.5 px-4 text-left text-sm font-medium">
                      Store
                    </th>
                    <th className="py-2.5 px-4 text-left text-sm font-medium hidden sm:table-cell">
                      Product Name
                    </th>
                    <th className="py-2.5 px-4 text-right text-sm font-medium">
                      Price
                    </th>
                    <th className="py-2.5 px-4 text-center text-sm font-medium">
                      Worth it?
                    </th>
                    <th className="py-2.5 px-4 text-right text-sm font-medium hidden sm:table-cell">
                      Link
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPrices.map((sp, i) => {
                    const effective = sp.sale_price ?? sp.price;
                    const isCheapest = sp.store_id === cheapestStoreId;
                    const isOnSale =
                      sp.sale_price != null &&
                      sp.price != null &&
                      sp.sale_price < sp.price;

                    return (
                      <tr
                        key={`${sp.store_id}-${i}`}
                        className={`border-b last:border-0 transition-colors ${
                          isCheapest
                            ? "bg-emerald-500/5"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <Link href={`/store/${sp.store_id}`}>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium hover:opacity-80 transition-opacity ${
                                STORE_COLORS[sp.store_id] ?? "bg-muted text-foreground"
                              }`}
                            >
                              {STORE_SHORT_NAMES[sp.store_id] ?? sp.store_id}
                            </span>
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground hidden sm:table-cell">
                          <span className="line-clamp-1">{sp.name}</span>
                          {sp.size && (
                            <span className="text-xs text-muted-foreground/70 ml-1">
                              ({sp.size})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          <span
                            className={`font-semibold ${
                              isCheapest
                                ? "text-emerald-700 dark:text-emerald-400"
                                : ""
                            }`}
                          >
                            {formatKYD(effective)}
                          </span>
                          {isOnSale && (
                            <div className="text-xs line-through text-muted-foreground">
                              {formatKYD(sp.price)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <ProductRating
                            productId={product.id}
                            storeId={sp.store_id}
                            initialUp={ratings[sp.store_id]?.up ?? 0}
                            initialDown={ratings[sp.store_id]?.down ?? 0}
                          />
                        </td>
                        <td className="py-3 px-4 text-right hidden sm:table-cell">
                          {sp.source_url && (
                            <a
                              href={sp.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              View
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Price history chart */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            Price History
          </h2>
          {chartData.length >= 2 ? (
            <div className="border rounded-xl p-4">
              <PriceChartWrapper data={chartData} storeIds={chartStoreIds} />
            </div>
          ) : (
            <div className="border rounded-xl p-4 bg-muted/20">
              <p className="text-sm text-muted-foreground">
                Price tracking just started for this product.
                {hasHistory && (
                  <>
                    {" "}We have{" "}
                    <span className="font-medium text-foreground">
                      {history.length}
                    </span>{" "}
                    data point{history.length === 1 ? "" : "s"} so far.
                  </>
                )}
                {" "}Check back soon for price trends.
              </p>
            </div>
          )}
        </section>

        {/* Related products */}
        {related.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">
              Related Products
              {topCategory && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  in {topCategory}
                </span>
              )}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {related.map((rp) => (
                <Link
                  key={rp.id}
                  href={`/prices/${rp.slug}`}
                  className="group flex items-start gap-3 rounded-xl border bg-card p-3 hover:border-primary/30 transition-colors"
                >
                  {rp.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={rp.image_url}
                      alt={rp.canonical_name}
                      className="w-12 h-12 rounded-lg object-cover shrink-0 bg-muted"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                      <Tag className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                      {rp.canonical_name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {[rp.brand, rp.size].filter(Boolean).join(" - ")}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {rp.min_price != null && (
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          from {formatKYD(rp.min_price)}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {rp.store_count} store{rp.store_count === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
