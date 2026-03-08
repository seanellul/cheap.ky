export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Search, Eye, TrendingUp, BarChart3, Clock } from "lucide-react";
import { productToSlug } from "@/lib/utils/slug";
import {
  getAnalyticsOverview,
  getTrendingSearches,
  getPopularProducts,
  getDailyStats,
  getRecentSearches,
} from "@/lib/data/analytics";

export const metadata: Metadata = {
  title: "Live Analytics",
  description:
    "See what Cayman Islands shoppers are searching for and comparing. Live, open-source analytics from Cheap.ky.",
  alternates: {
    canonical: "https://cheap.ky/analytics",
  },
};

export default async function AnalyticsPage() {
  const [overview, trending, popular, daily, recent] = await Promise.all([
    getAnalyticsOverview(),
    getTrendingSearches(7, 20),
    getPopularProducts(7, 15),
    getDailyStats(30),
    getRecentSearches(15),
  ]);

  // Fill in slugs for popular products
  const popularWithSlugs = popular.map((p) => ({
    ...p,
    slug: productToSlug(p.name, p.productId),
  }));

  // Find peak day
  const peakDay = daily.reduce(
    (max, d) => (d.searches + d.productViews > max.total ? { date: d.date, total: d.searches + d.productViews } : max),
    { date: "", total: 0 }
  );

  return (
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
        <span className="text-foreground font-medium">Analytics</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold sm:text-3xl tracking-tight">
          Live Analytics
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Open stats from Cheap.ky — see what Cayman shoppers are searching and comparing
        </p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Search className="h-4 w-4" />
            Total Searches
          </div>
          <div className="mt-1.5 text-2xl font-bold">
            {overview.totalSearches.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {overview.searchesToday} today
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Eye className="h-4 w-4" />
            Product Views
          </div>
          <div className="mt-1.5 text-2xl font-bold">
            {overview.totalProductViews.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {overview.viewsToday} today
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <BarChart3 className="h-4 w-4" />
            Comparisons
          </div>
          <div className="mt-1.5 text-2xl font-bold">
            {overview.totalCompareViews.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <TrendingUp className="h-4 w-4" />
            Peak Day
          </div>
          <div className="mt-1.5 text-2xl font-bold">
            {peakDay.total.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {peakDay.date
              ? new Date(peakDay.date + "T12:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "—"}
          </div>
        </div>
      </div>

      {/* Activity chart - simple bar visualization */}
      {daily.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Last 30 Days</h2>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-end gap-[1px] sm:gap-[2px] h-24 sm:h-32">
              {daily.map((d) => {
                const total = d.searches + d.productViews;
                const maxTotal = Math.max(...daily.map((dd) => dd.searches + dd.productViews), 1);
                const heightPct = (total / maxTotal) * 100;
                const searchPct = total > 0 ? (d.searches / total) * heightPct : 0;
                const viewPct = heightPct - searchPct;
                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col justify-end gap-[1px] group relative"
                    title={`${d.date}: ${d.searches} searches, ${d.productViews} views`}
                  >
                    <div
                      className="bg-primary/60 rounded-t-[2px] min-h-[1px] transition-colors group-hover:bg-primary"
                      style={{ height: `${viewPct}%` }}
                    />
                    <div
                      className="bg-primary rounded-b-[2px] min-h-[1px]"
                      style={{ height: `${searchPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>
                {daily[0]
                  ? new Date(daily[0].date + "T12:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : ""}
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-primary inline-block" /> Searches
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-primary/60 inline-block" /> Views
                </span>
              </div>
              <span>
                {daily[daily.length - 1]
                  ? new Date(daily[daily.length - 1].date + "T12:00:00").toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" }
                    )
                  : ""}
              </span>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trending searches */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Trending Searches This Week
          </h2>
          {trending.length > 0 ? (
            <>
              {/* Mobile: card layout */}
              <div className="sm:hidden space-y-1.5">
                {trending.map((t, i) => (
                  <Link
                    key={t.query}
                    href={`/?q=${encodeURIComponent(t.query)}`}
                    className="flex items-center justify-between gap-2 border rounded-xl p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground tabular-nums w-5 flex-shrink-0">{i + 1}</span>
                      <span className="text-sm font-medium truncate">{t.query}</span>
                    </div>
                    <span className="text-sm tabular-nums text-muted-foreground flex-shrink-0">{t.count}</span>
                  </Link>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden sm:block rounded-xl border bg-card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="py-2 px-3 text-left text-sm font-medium">#</th>
                      <th className="py-2 px-3 text-left text-sm font-medium">Search Term</th>
                      <th className="py-2 px-3 text-right text-sm font-medium">Searches</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trending.map((t, i) => (
                      <tr key={t.query} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 px-3 text-sm text-muted-foreground tabular-nums">
                          {i + 1}
                        </td>
                        <td className="py-2 px-3">
                          <Link
                            href={`/?q=${encodeURIComponent(t.query)}`}
                            className="text-sm font-medium hover:text-primary transition-colors"
                          >
                            {t.query}
                          </Link>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-sm">
                          {t.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
              No searches yet. Be the first!
            </div>
          )}
        </section>

        {/* Most viewed products */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Most Viewed Products
          </h2>
          {popularWithSlugs.length > 0 ? (
            <>
              {/* Mobile: card layout */}
              <div className="sm:hidden space-y-1.5">
                {popularWithSlugs.map((p, i) => (
                  <Link
                    key={p.productId}
                    href={`/prices/${p.slug}`}
                    className="flex items-center justify-between gap-2 border rounded-xl p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground tabular-nums w-5 flex-shrink-0">{i + 1}</span>
                      <span className="text-sm font-medium truncate">{p.name}</span>
                    </div>
                    <span className="text-sm tabular-nums text-muted-foreground flex-shrink-0">{p.views}</span>
                  </Link>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden sm:block rounded-xl border bg-card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="py-2 px-3 text-left text-sm font-medium">#</th>
                      <th className="py-2 px-3 text-left text-sm font-medium">Product</th>
                      <th className="py-2 px-3 text-right text-sm font-medium">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {popularWithSlugs.map((p, i) => (
                      <tr key={p.productId} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 px-3 text-sm text-muted-foreground tabular-nums">
                          {i + 1}
                        </td>
                        <td className="py-2 px-3">
                          <Link
                            href={`/prices/${p.slug}`}
                            className="text-sm font-medium hover:text-primary transition-colors line-clamp-1"
                          >
                            {p.name}
                          </Link>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-sm">
                          {p.views}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
              No product views yet.
            </div>
          )}
        </section>
      </div>

      {/* Live feed */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Recent Searches
        </h2>
        {recent.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {recent.map((r, i) => (
              <Link
                key={`${r.query}-${i}`}
                href={`/?q=${encodeURIComponent(r.query)}`}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                <span>{r.query}</span>
                <span className="text-xs text-muted-foreground">
                  {r.resultCount > 0 ? `${r.resultCount} results` : ""}
                </span>
                <span className="text-xs text-muted-foreground/60">{r.ago}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No recent searches yet.
          </div>
        )}
      </section>

      {/* Transparency note */}
      <section className="border rounded-xl p-4 bg-muted/20">
        <h2 className="text-sm font-semibold mb-1.5">About These Analytics</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          These are real, live stats from Cheap.ky. We believe in full transparency —
          no inflated numbers, no vanity metrics. We don&apos;t track personal information,
          IP addresses, or use cookies. Just anonymous search queries and page views
          to show what Cayman shoppers care about.
        </p>
      </section>
    </div>
  );
}
