export const revalidate = 3600;

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCategoryBySlug, getCategories } from "@/lib/data/categories";
import { formatKYD } from "@/lib/utils/currency";
import {
  ChevronRight,
  ChevronLeft,
  TrendingDown,
  Tag,
  Store,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────

const STORE_IDS = ["fosters", "hurleys", "kirkmarket", "costuless", "pricedright"] as const;

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
  searchParams: Promise<{ page?: string }>;
}

// ── Metadata ──────────────────────────────────────────────────────────

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const data = await getCategoryBySlug(slug, 1, 1);
  if (!data) return { title: "Category Not Found" };

  const storeCount = STORE_IDS.length;

  return {
    title: `${data.name} Prices in Cayman Islands`,
    description: `Compare ${data.name} prices across ${storeCount} Cayman grocery stores. ${data.productCount} products compared. Find the cheapest ${data.name.toLowerCase()} today.`,
    alternates: { canonical: `https://cheap.ky/category/${slug}${page > 1 ? `?page=${page}` : ""}` },
    openGraph: {
      title: `${data.name} Prices -- Cheap.ky`,
      description: `Compare ${data.name} prices across Cayman Islands stores.`,
    },
  };
}

// ── Static params ────────────────────────────────────────────────────

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

// ── Page ──────────────────────────────────────────────────────────────

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const perPage = 50;

  const data = await getCategoryBySlug(slug, page, perPage);
  if (!data) notFound();

  const { name, productCount, products, totalPages, avgSavings, totalSavings } = data;

  // Get related categories (other categories for sidebar)
  const allCategories = await getCategories();
  const relatedCategories = allCategories
    .filter((c) => c.slug !== slug)
    .slice(0, 12);

  // Detect which stores appear in this category
  const activeStoreIds = new Set<string>();
  for (const p of products) {
    for (const sid of Object.keys(p.prices)) {
      activeStoreIds.add(sid);
    }
  }
  const orderedStores = STORE_IDS.filter((s) => activeStoreIds.has(s));

  // Build page URL helper
  function pageUrl(p: number): string {
    const params = new URLSearchParams();
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/category/${slug}${qs ? `?${qs}` : ""}`;
  }

  // JSON-LD structured data
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://cheap.ky" },
      { "@type": "ListItem", position: 2, name: "Categories", item: "https://cheap.ky/category" },
      { "@type": "ListItem", position: 3, name },
    ],
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${name} Prices in Cayman Islands`,
    url: `https://cheap.ky/category/${slug}`,
    description: `Compare ${name} prices across Cayman Islands grocery stores. ${productCount} products compared.`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: productCount,
      itemListElement: products.slice(0, 10).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://cheap.ky/prices/${p.slug}`,
        name: p.name,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <Link href="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/category" className="hover:text-primary transition-colors">
          Categories
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{name}</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {name} Prices
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {productCount} product{productCount === 1 ? "" : "s"} compared across
          Cayman Islands stores
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Tag className="h-4 w-4" />
            Products Compared
          </div>
          <div className="mt-1.5 text-2xl font-bold">{productCount}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <TrendingDown className="h-4 w-4" />
            Avg Price Gap
          </div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {formatKYD(avgSavings)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            per product
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Store className="h-4 w-4" />
            Total Savings Available
          </div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {formatKYD(totalSavings)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            across all products
          </div>
        </div>
      </div>

      {/* Product comparison table */}
      {products.length > 0 ? (
        <section>
          {/* Desktop table */}
          <div className="border rounded-xl overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="py-2.5 px-4 text-left text-sm font-medium">
                      Product
                    </th>
                    {orderedStores.map((s) => (
                      <th
                        key={s}
                        className="py-2.5 px-3 text-right text-sm font-medium"
                      >
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            STORE_COLORS[s] ?? "bg-muted text-foreground"
                          }`}
                        >
                          {STORE_SHORT_NAMES[s] ?? s}
                        </span>
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-right text-sm font-medium">
                      Savings
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    // Find cheapest store for highlighting
                    let cheapestPrice = Infinity;
                    let cheapestStore = "";
                    for (const [sid, pr] of Object.entries(p.prices)) {
                      const effective = pr.salePrice ?? pr.price;
                      if (effective != null && effective < cheapestPrice) {
                        cheapestPrice = effective;
                        cheapestStore = sid;
                      }
                    }

                    return (
                      <tr
                        key={p.id}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <Link
                            href={`/prices/${p.slug}`}
                            className="text-sm font-medium hover:text-primary transition-colors line-clamp-1"
                          >
                            {p.name}
                          </Link>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {[p.brand, p.size].filter(Boolean).join(" - ")}
                          </div>
                        </td>
                        {orderedStores.map((sid) => {
                          const pr = p.prices[sid];
                          const effective = pr
                            ? (pr.salePrice ?? pr.price)
                            : null;
                          const isCheapest = sid === cheapestStore;
                          return (
                            <td
                              key={sid}
                              className="py-3 px-3 text-right tabular-nums text-sm"
                            >
                              {effective != null ? (
                                <span
                                  className={`font-semibold ${
                                    isCheapest
                                      ? "text-emerald-700 dark:text-emerald-400"
                                      : ""
                                  }`}
                                >
                                  {formatKYD(effective)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/40">
                                  --
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-3 px-3 text-right">
                          {p.savings > 0.01 && (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              {formatKYD(p.savings)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {products.map((p) => {
              let cheapestPrice = Infinity;
              let cheapestStore = "";
              for (const [sid, pr] of Object.entries(p.prices)) {
                const effective = pr.salePrice ?? pr.price;
                if (effective != null && effective < cheapestPrice) {
                  cheapestPrice = effective;
                  cheapestStore = sid;
                }
              }

              return (
                <Link
                  key={p.id}
                  href={`/prices/${p.slug}`}
                  className="block rounded-xl border bg-card p-3 hover:border-primary/30 transition-colors"
                >
                  <div className="font-medium text-sm line-clamp-1">
                    {p.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {[p.brand, p.size].filter(Boolean).join(" - ")}
                  </div>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {STORE_IDS.filter((sid) => p.prices[sid]).map((sid) => {
                      const pr = p.prices[sid];
                      const effective = pr.salePrice ?? pr.price;
                      const isCheapest = sid === cheapestStore;
                      return (
                        <div key={sid} className="text-xs">
                          <span
                            className={`${
                              STORE_COLORS[sid] ?? ""
                            } rounded-full px-1.5 py-0.5 font-medium`}
                          >
                            {STORE_SHORT_NAMES[sid]}
                          </span>
                          <span
                            className={`ml-1 font-semibold tabular-nums ${
                              isCheapest
                                ? "text-emerald-700 dark:text-emerald-400"
                                : ""
                            }`}
                          >
                            {formatKYD(effective)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {p.savings > 0.01 && (
                    <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-1.5">
                      Save {formatKYD(p.savings)}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No compared products found in this category.
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-center gap-2"
        >
          {page > 1 ? (
            <Link
              href={pageUrl(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed">
              <ChevronLeft className="h-4 w-4" />
              Previous
            </span>
          )}

          <span className="text-sm text-muted-foreground px-2">
            Page {page} of {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={pageUrl(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed">
              Next
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </nav>
      )}

      {/* Related categories */}
      {relatedCategories.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Related Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {relatedCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className="rounded-xl border bg-card p-3 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="font-medium text-sm line-clamp-1">
                  {cat.name}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {cat.productCount} product{cat.productCount === 1 ? "" : "s"}
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
