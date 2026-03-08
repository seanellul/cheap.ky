export const revalidate = 3600;

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getStoreData, STORE_META } from "@/lib/data/stores";
import { formatKYD } from "@/lib/utils/currency";
import {
  ChevronRight,
  ExternalLink,
  TrendingDown,
  TrendingUp,
  Store,
  BarChart3,
  Package,
  Trophy,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────

const STORE_COLORS: Record<string, string> = {
  fosters: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  hurleys: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  kirkmarket: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  costuless: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  pricedright: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
};

const STORE_IDS = ["fosters", "hurleys", "kirkmarket", "costuless", "pricedright"];

// ── Types ──────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

// ── Static params ─────────────────────────────────────────────────────

export function generateStaticParams() {
  return [
    { id: "fosters" },
    { id: "hurleys" },
    { id: "kirkmarket" },
    { id: "costuless" },
    { id: "pricedright" },
  ];
}

// ── Metadata ──────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const store = STORE_META[id];
  if (!store) return { title: "Store Not Found" };

  const otherStores = STORE_IDS.filter((s) => s !== id)
    .map((s) => STORE_META[s].name)
    .join(", ");

  return {
    title: `${store.fullName} Prices & Comparison`,
    description: `Compare ${store.fullName} prices against ${otherStores}. See where ${store.name} is cheapest in the Cayman Islands. Updated daily.`,
    openGraph: {
      title: `${store.fullName} Prices -- Cheap.ky`,
      description: `Compare ${store.fullName} grocery prices against other Cayman Islands stores.`,
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────

export default async function StoreOverviewPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getStoreData(id);
  if (!data) notFound();

  const { meta, stats, bestProducts, worstProducts, topCategories } = data;

  const otherStores = STORE_IDS.filter((s) => s !== id)
    .map((s) => STORE_META[s].name)
    .join(", ");

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: meta.fullName,
    url: meta.website,
    description: meta.description,
    address: {
      "@type": "PostalAddress",
      addressCountry: "KY",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
          <span className="text-foreground font-medium">{meta.name}</span>
        </nav>

        {/* Store header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {meta.fullName}
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 max-w-2xl">
            {meta.description}
          </p>
          <a
            href={meta.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-2"
          >
            Visit {meta.name} website
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <Package className="h-4 w-4" />
              Total Products
            </div>
            <div className="mt-1.5 text-2xl font-bold">
              {stats.totalProducts.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <BarChart3 className="h-4 w-4" />
              UPC Matches
            </div>
            <div className="mt-1.5 text-2xl font-bold">
              {stats.matchedProducts.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              cross-store comparable
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <Trophy className="h-4 w-4" />
              Win Rate
            </div>
            <div className="mt-1.5 text-2xl font-bold">
              {stats.winRate}%
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              cheapest among matches
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <Store className="h-4 w-4" />
              Avg Price
            </div>
            <div className="mt-1.5 text-2xl font-bold">
              {formatKYD(stats.avgPrice)}
            </div>
          </div>
        </div>

        {/* Best products */}
        {bestProducts.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Where {meta.name} Beats the Competition
            </h2>
            {/* Mobile: card layout */}
            <div className="sm:hidden space-y-2">
              {bestProducts.map((p) => (
                <div key={p.id} className="border rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/prices/${p.slug}`}
                        className="text-sm font-medium hover:text-primary transition-colors line-clamp-1"
                      >
                        {p.name}
                      </Link>
                      {p.size && (
                        <span className="text-xs text-muted-foreground ml-1">({p.size})</span>
                      )}
                    </div>
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 flex-shrink-0">
                      -{p.pctSavings}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-sm">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatKYD(p.storePrice)}</span>
                    <span className="text-xs text-muted-foreground">vs {formatKYD(p.nextBestPrice)} next best</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="py-2.5 px-4 text-left text-sm font-medium">
                      Product
                    </th>
                    <th className="py-2.5 px-4 text-right text-sm font-medium">
                      {meta.name}
                    </th>
                    <th className="py-2.5 px-4 text-right text-sm font-medium">
                      Next Best
                    </th>
                    <th className="py-2.5 px-4 text-right text-sm font-medium">
                      Savings
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bestProducts.map((p) => (
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
                        {p.size && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({p.size})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        {formatKYD(p.storePrice)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-sm text-muted-foreground">
                        {formatKYD(p.nextBestPrice)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          -{p.pctSavings}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Worst products — transparency */}
        {worstProducts.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-500 dark:text-red-400" />
              Where {meta.name} Is Most Expensive
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              Transparency matters. These products are cheaper at other stores.
            </p>
            {/* Mobile: card layout */}
            <div className="sm:hidden space-y-2">
              {worstProducts.map((p) => (
                <div key={p.id} className="border rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/prices/${p.slug}`}
                        className="text-sm font-medium hover:text-primary transition-colors line-clamp-1"
                      >
                        {p.name}
                      </Link>
                      {p.size && (
                        <span className="text-xs text-muted-foreground ml-1">({p.size})</span>
                      )}
                    </div>
                    <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400 flex-shrink-0">
                      +{p.pctPremium}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-sm">
                    <span className="font-semibold text-red-600 dark:text-red-400 tabular-nums">{formatKYD(p.storePrice)}</span>
                    <span className="text-xs text-muted-foreground">vs {formatKYD(p.cheapestPrice)} cheapest</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="py-2.5 px-4 text-left text-sm font-medium">
                      Product
                    </th>
                    <th className="py-2.5 px-4 text-right text-sm font-medium">
                      {meta.name}
                    </th>
                    <th className="py-2.5 px-4 text-right text-sm font-medium">
                      Cheapest
                    </th>
                    <th className="py-2.5 px-4 text-right text-sm font-medium">
                      Premium
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {worstProducts.map((p) => (
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
                        {p.size && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({p.size})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-sm font-semibold text-red-600 dark:text-red-400">
                        {formatKYD(p.storePrice)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-sm text-muted-foreground">
                        {formatKYD(p.cheapestPrice)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                          +{p.pctPremium}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Top categories */}
        {topCategories.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">
              Top Categories at {meta.name}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {topCategories.map((cat) => (
                <div
                  key={cat.name}
                  className="rounded-xl border bg-card p-3 hover:border-primary/30 transition-colors"
                >
                  <div className="font-medium text-sm line-clamp-1">
                    {cat.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {cat.count} product{cat.count === 1 ? "" : "s"}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Other stores */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Compare Other Stores
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STORE_IDS.filter((s) => s !== id).map((s) => {
              const m = STORE_META[s];
              const colors = STORE_COLORS[s] ?? "bg-muted text-foreground border-border";
              return (
                <Link
                  key={s}
                  href={`/store/${s}`}
                  className={`rounded-xl border p-3 transition-colors hover:shadow-sm ${colors}`}
                >
                  <div className="font-semibold text-sm">{m.name}</div>
                  <div className="text-xs opacity-75 mt-0.5 line-clamp-1">
                    {m.description}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Methodology */}
        <section className="border rounded-xl p-4 bg-muted/20">
          <h2 className="text-sm font-semibold mb-1.5">Methodology</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Win rate and price comparisons are calculated using UPC-matched
            products only — items confirmed to be the same product across
            stores. Prices include sale prices when available. {meta.name} is
            compared against {otherStores}. Data is updated daily via automated
            store scraping.
          </p>
        </section>
      </div>
    </>
  );
}
