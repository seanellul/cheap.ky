export const revalidate = 3600;

import Link from "next/link";
import type { Metadata } from "next";
import { getProductList, getTopCategories } from "@/lib/data/products";
import { formatKYD } from "@/lib/utils/currency";
import { ChevronRight, ChevronLeft, Tag, Store } from "lucide-react";
import { PriceSearchInput } from "./search-input";

export const metadata: Metadata = {
  title: "Compare Grocery Prices in Cayman Islands",
  description:
    "Browse and compare grocery prices across Cayman Islands stores including Foster's, Hurley's, Kirk Market, Cost-U-Less, and Priced Right. Find the cheapest prices on thousands of products.",
};

interface PageProps {
  searchParams: Promise<{ page?: string; category?: string; q?: string }>;
}

const STORE_COLORS: Record<string, string> = {
  fosters: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  hurleys: "bg-red-500/10 text-red-700 dark:text-red-400",
  kirkmarket: "bg-green-500/10 text-green-700 dark:text-green-400",
  costuless: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  pricedright: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
};

export default async function PricesIndexPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const category = sp.category || undefined;
  const search = sp.q || undefined;
  const perPage = 48;

  const { products, total } = await getProductList({
    page,
    perPage,
    category,
    search,
  });
  const totalPages = Math.ceil(total / perPage);
  const categories = await getTopCategories();

  // Build URL helper for pagination
  function pageUrl(p: number): string {
    const params = new URLSearchParams();
    if (p > 1) params.set("page", String(p));
    if (category) params.set("category", category);
    if (search) params.set("q", search);
    const qs = params.toString();
    return `/prices${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 text-sm text-muted-foreground mb-3"
        >
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">Prices</span>
          {category && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground font-medium">{category}</span>
            </>
          )}
        </nav>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {category
            ? `${category} Prices`
            : "Compare Grocery Prices"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {total.toLocaleString()} product{total === 1 ? "" : "s"} found
          {category ? ` in ${category}` : ""}{" "}
          across Cayman Islands stores
        </p>
      </div>

      {/* Search */}
      <PriceSearchInput defaultValue={search} category={category} />

      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href="/prices"
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !category
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          All
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat}
            href={`/prices?category=${encodeURIComponent(cat)}`}
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              category === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat}
          </Link>
        ))}
      </div>

      {/* Product grid */}
      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/prices/${p.slug}`}
              className="group flex items-start gap-3 rounded-xl border bg-card p-3 hover:border-primary/30 hover:shadow-sm transition-all"
            >
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image_url}
                  alt={p.canonical_name}
                  className="w-14 h-14 rounded-lg object-cover shrink-0 bg-muted"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                  <Tag className="h-5 w-5 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                  {p.canonical_name}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {[p.brand, p.size].filter(Boolean).join(" - ")}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  {p.min_price != null && (
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      from {formatKYD(p.min_price)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Store className="h-3 w-3" />
                    {p.store_count} store{p.store_count === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No products found. Try a different search or category.
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
    </div>
  );
}
