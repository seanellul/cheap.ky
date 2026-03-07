"use client";

import { useState, useEffect } from "react";
import {
  Search,
  ArrowLeftRight,
  ListChecks,
  BarChart3,
  ShoppingCart,
  TrendingDown,
  Store,
  Package,
  ChevronRight,
  BookOpen,
  LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import { SearchBar } from "@/components/search-bar";
import { SearchBubbles } from "@/components/search-bubbles";
import { ProductCard } from "@/components/product-card";
import {
  PriceComparisonRow,
  PriceComparisonHeader,
} from "@/components/price-comparison-row";
import { SearchResultSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/empty-state";
import { ProductDetailDialog } from "@/components/product-detail-dialog";
import { useCart } from "@/lib/contexts/cart-context";
import { trackSearch, trackAddToCart, trackProductView } from "@/lib/analytics";
import { track } from "@/lib/utils/track";

interface SearchResult {
  id: number;
  name: string;
  brand: string | null;
  size: string | null;
  imageUrl: string | null;
  minPrice: number | null;
  storeCount: number;
  prices: Record<string, { price: number | null; salePrice: number | null; name: string }>;
  priceChanges?: Record<string, { direction: "up" | "down"; amount: number }>;
}

interface SiteStats {
  products: number;
  stores: number;
  matches: number;
  avgSavingsPct: number;
  maxSavingsKyd: number;
}

const FEATURES = [
  {
    href: "/category",
    icon: LayoutGrid,
    title: "Browse Categories",
    description: "Browse by aisle — dairy, produce, frozen, snacks, and more",
    color: "text-store-costuless",
    bg: "bg-store-costuless/10",
  },
  {
    href: "/compare",
    icon: ArrowLeftRight,
    title: "Compare Products",
    description: "Side-by-side price comparison across every store for any product",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    href: "/staples",
    icon: ListChecks,
    title: "Everyday Staples",
    description: "Pre-matched essentials — milk, eggs, bread, chicken — at a glance",
    color: "text-savings",
    bg: "bg-savings/10",
  },
  {
    href: "/report",
    icon: BarChart3,
    title: "Market Report",
    description: "See which store is cheapest overall and how much you could save",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    href: "/cart",
    icon: ShoppingCart,
    title: "Smart Cart",
    description: "Build a shopping list and find the cheapest store combination",
    color: "text-store-hurleys",
    bg: "bg-store-hurleys/10",
  },
  {
    href: "/blog",
    icon: BookOpen,
    title: "Blog & Guides",
    description: "Tips on saving money, seasonal deals, and Cayman grocery insights",
    color: "text-store-kirkmarket",
    bg: "bg-store-kirkmarket/10",
  },
];

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export default function HomePage() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [resultKey, setResultKey] = useState(0);
  const { refreshCart } = useCart();

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  async function handleAddToCart(productId: number) {
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    refreshCart();
    const item = results.find((r) => r.id === productId);
    if (item) trackAddToCart(item.name, "search", item.minPrice ?? 0);
    toast.success("Added to cart", {
      description: item?.name ?? "Item added",
      action: { label: "View Cart", onClick: () => window.location.href = "/cart" },
    });
  }

  function handleResults(r: SearchResult[]) {
    setResults(r);
    setHasSearched(true);
    setResultKey((k) => k + 1);
    if (query.length >= 2) {
      track("search", query, { resultCount: r.length });
      trackSearch(query, r.length);
    }
  }

  function handleBubbleSelect(term: string) {
    (window as any).__setSearchQuery?.(term);
  }

  const isSearchActive = loading || (hasSearched && (query.length >= 2 || results.length > 0));
  const showLanding = !isSearchActive;
  const showBubbles = searchFocused && !loading && query.length < 2 && results.length === 0;

  return (
    <div className="space-y-5">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 px-4 py-3.5 sm:px-8 sm:py-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,var(--color-accent)/0.06,transparent_60%)]" />
        <div className="relative max-w-2xl">
          <h1 className="text-base sm:text-xl font-bold tracking-tight text-foreground leading-snug">
            {stats ? (
              <>Compare <span className="text-primary">{stats.products.toLocaleString()}</span> grocery prices across Cayman</>
            ) : (
              <>Compare grocery prices across Cayman</>
            )}
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5 sm:text-sm max-w-md">
            Don&apos;t just shop &mdash; be{" "}
            <span className="font-semibold text-foreground">Cheap.ky</span>
          </p>
        </div>
      </section>

      {/* ── Search ── */}
      <SearchBar
        onResults={handleResults}
        onLoadingChange={setLoading}
        onQueryChange={setQuery}
        onFocusChange={setSearchFocused}
      />

      {/* ── Search bubbles (landing state) ── */}
      {showBubbles && (
        <div className="pt-1 animate-slide-up-fade">
          <p className="text-center text-xs text-muted-foreground mb-1.5">
            Tap to search
          </p>
          <SearchBubbles onSelect={handleBubbleSelect} />
        </div>
      )}

      {/* ── Loading ── */}
      {loading && <SearchResultSkeleton />}

      {/* ── Results ── */}
      {!loading && results.length > 0 && (
        <div key={resultKey} className="space-y-3">
          <div className="text-xs text-muted-foreground px-1 animate-slide-up-fade">
            <span className="font-medium text-foreground">{results.length}</span> result{results.length === 1 ? "" : "s"}
            {results.filter((r) => r.storeCount > 1).length > 0 && (
              <span>
                {" "}&middot; {results.filter((r) => r.storeCount > 1).length} compared across stores
              </span>
            )}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2 stagger-children">
            {results.map((r) => (
              <ProductCard
                key={r.id}
                id={r.id}
                name={r.name}
                brand={r.brand}
                size={r.size}
                imageUrl={r.imageUrl}
                prices={r.prices}
                priceChanges={r.priceChanges}
                minPrice={r.minPrice}
                onAddToCart={handleAddToCart}
                onClickProduct={setSelectedProductId}
              />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block border rounded-xl overflow-hidden animate-slide-up-fade">
            <table className="w-full">
              <PriceComparisonHeader />
              <tbody className="stagger-children">
                {results.map((r) => (
                  <PriceComparisonRow
                    key={r.id}
                    id={r.id}
                    name={r.name}
                    brand={r.brand}
                    size={r.size}
                    imageUrl={r.imageUrl}
                    prices={r.prices}
                    priceChanges={r.priceChanges}
                    minPrice={r.minPrice}
                    onAddToCart={handleAddToCart}
                    onClickProduct={setSelectedProductId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && hasSearched && query.length >= 2 && results.length === 0 && (
        <EmptyState
          icon={Search}
          title="No products found"
          description="Try a different search term or check your spelling"
        />
      )}

      {/* ── Landing sections (hidden when actively searching) ── */}
      {showLanding && (
        <>
          {/* Stats bar */}
          {stats && (
            <section className="grid grid-cols-3 gap-3 stagger-children">
              {[
                { icon: Package, value: formatCount(stats.products), label: "Products tracked" },
                { icon: Store, value: String(stats.stores), label: "Stores compared" },
                { icon: TrendingDown, value: formatCount(stats.matches), label: "Price matches" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border bg-card p-3.5 sm:p-4 text-center"
                >
                  <stat.icon className="h-5 w-5 mx-auto mb-1.5 text-primary/60" />
                  <div className="text-xl sm:text-2xl font-bold tabular-nums text-foreground">
                    {stat.value}
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                    {stat.label}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* How it works */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold sm:text-xl">How it works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 stagger-children">
              {[
                {
                  step: "1",
                  title: "Search any product",
                  desc: "Type what you need — we search across all major Cayman grocery stores at once.",
                },
                {
                  step: "2",
                  title: "Compare instantly",
                  desc: "See every store's price side by side. The cheapest option is highlighted automatically.",
                },
                {
                  step: "3",
                  title: "Save real money",
                  desc: "Build a smart cart, check the market report, or just know you're getting the best deal.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl border bg-card p-4 sm:p-5"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                      {item.step}
                    </span>
                    <h3 className="font-semibold text-sm sm:text-base">{item.title}</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Feature links */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold sm:text-xl">Explore</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
              {FEATURES.map((feature) => (
                <a
                  key={feature.href}
                  href={feature.href}
                  className="group rounded-xl border bg-card p-4 sm:p-5 flex gap-3.5 items-start hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.98]"
                >
                  <div className={`shrink-0 rounded-lg p-2.5 ${feature.bg}`}>
                    <feature.icon className={`h-5 w-5 ${feature.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <h3 className="font-semibold text-sm sm:text-base">
                        {feature.title}
                      </h3>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* Mission */}
          <section className="rounded-2xl border bg-gradient-to-br from-card to-muted/30 p-5 sm:p-8 space-y-3">
            <h2 className="text-lg font-bold sm:text-xl">Why Cheap.ky?</h2>
            <div className="space-y-3 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
              <p>
                Living in the Cayman Islands is incredible &mdash; but the cost
                of groceries isn&apos;t. Between import duties, freight costs,
                and limited competition, everyday food prices can feel
                disproportionately high for a lot of residents.
              </p>
              <p>
                <span className="text-foreground font-medium">Cheap.ky</span>{" "}
                was built to give locals and residents a simple tool to see
                what&apos;s actually out there. When you can compare prices
                across every store in seconds, you shop smarter &mdash; and
                that adds up. We believe price transparency is a small but
                meaningful step toward making island life a little more
                affordable for everyone.
              </p>
              <p className="text-muted-foreground/70 text-xs sm:text-sm">
                Free to use. No ads. No data selling. Just prices.
              </p>
            </div>
          </section>
        </>
      )}

      <ProductDetailDialog
        productId={selectedProductId}
        onClose={() => setSelectedProductId(null)}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}
