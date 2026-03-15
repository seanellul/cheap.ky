"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
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
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { SearchBar, type SearchBarHandle } from "@/components/search-bar";
import { SearchBubbles } from "@/components/search-bubbles";
import { RecentSearches } from "@/components/recent-searches";
import { ProductCard } from "@/components/product-card";
import {
  PriceComparisonRow,
  PriceComparisonHeader,
} from "@/components/price-comparison-row";
import { SearchResultSkeleton } from "@/components/skeletons";
import { SearchNoResults } from "@/components/search-no-results";
import { ProductDetailDialog } from "@/components/product-detail-dialog";
import { MissingProductButton } from "@/components/missing-product-button";
import { ProductImage } from "@/components/product-image";
import { SaleBadge } from "@/components/sale-badge";
import { StoreBadge } from "@/components/store-badge";
import { ScrollReveal } from "@/components/scroll-reveal";
import { formatKYD } from "@/lib/utils/currency";
import { useCart } from "@/lib/contexts/cart-context";
import { useCountUp } from "@/lib/hooks/use-count-up";
import { trackSearch, trackAddToCart, trackProductView, trackBarcodeScan } from "@/lib/analytics";
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

interface SpecialItem {
  storeProductId: number;
  productId: number | null;
  name: string;
  brand: string | null;
  size: string | null;
  price: number | null;
  salePrice: number | null;
  imageUrl: string | null;
  storeId?: string;
}

interface SpecialStoreGroup {
  storeId: string;
  storeName: string;
  items: SpecialItem[];
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
    href: "/specials",
    icon: Tag,
    title: "Weekly Specials",
    description: "Sale prices and deals across Cayman stores, updated as prices change",
    color: "text-savings",
    bg: "bg-savings/10",
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
    color: "text-store-fosters",
    bg: "bg-store-fosters/10",
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
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [resultKey, setResultKey] = useState(0);
  const [specials, setSpecials] = useState<SpecialItem[]>([]);
  const { refreshCart } = useCart();
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchBarRef = useRef<SearchBarHandle>(null);

  // Read ?q= param (e.g. from history page links) and trigger search
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      const timer = setTimeout(() => {
        searchBarRef.current?.setQuery(q);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
    fetch("/api/specials")
      .then((r) => r.json())
      .then((data) => {
        const allItems: SpecialItem[] = (data.stores || []).flatMap(
          (s: SpecialStoreGroup) => s.items.map((item) => ({ ...item, storeId: s.storeId }))
        );
        setSpecials(allItems.slice(0, 6));
      })
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
      action: { label: "View Cart", onClick: () => router.push("/cart") },
    });
  }

  function handleResults(r: SearchResult[]) {
    setResults(r);
    setHasSearched(true);
    setResultKey((k) => k + 1);
    if (query.length >= 2) {
      const isBarcode = /^\d{8,14}$/.test(query.trim());
      if (isBarcode) {
        trackBarcodeScan(query, r.length > 0, r.length);
      } else {
        track("search", query, { resultCount: r.length });
        trackSearch(query, r.length);
      }
    }
  }

  function handleBubbleSelect(term: string) {
    searchBarRef.current?.setQuery(term);
  }

  const isSearchActive = loading || (hasSearched && (query.length >= 2 || results.length > 0));
  const showLanding = !isSearchActive;
  const showBubbles = searchFocused && !loading && query.length < 2 && results.length === 0;

  return (
    <div className="space-y-5">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/8 via-primary/14 to-accent/8 px-4 py-4 sm:px-10 sm:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,var(--color-accent)/0.1,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_1px_at_16px_16px,var(--color-primary)/0.06_1px,transparent_0)] [background-size:32px_32px]" />
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
        ref={searchBarRef}
        onResults={handleResults}
        onLoadingChange={setLoading}
        onQueryChange={setQuery}
        onFocusChange={setSearchFocused}
        onSuggestions={setSuggestions}
      />

      {/* ── Recent searches + bubbles (landing state) ── */}
      {showBubbles && (
        <div className="pt-1 space-y-3 animate-slide-up-fade">
          <RecentSearches onSelect={handleBubbleSelect} />
          <p className="text-center text-xs text-muted-foreground">
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

          <div className="flex justify-center pt-1">
            <MissingProductButton variant="inline" />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && hasSearched && query.length >= 2 && results.length === 0 && (
        <div className="space-y-3">
          <SearchNoResults
            query={query}
            suggestions={suggestions}
            onSelect={handleBubbleSelect}
            onClickProduct={setSelectedProductId}
            onAddToCart={handleAddToCart}
          />
          <div className="flex justify-center">
            <MissingProductButton />
          </div>
        </div>
      )}

      {/* ── Landing sections (hidden when actively searching) ── */}
      {showLanding && (
        <>
          {/* Stats bar */}
          {stats && (
            <ScrollReveal>
            <section className="grid grid-cols-3 gap-3 stagger-children">
              <StatCard icon={Package} target={stats.products} label="Products tracked" />
              <StatCard icon={Store} target={stats.stores} label="Stores compared" />
              <StatCard icon={TrendingDown} target={stats.matches} label="Price matches" />
            </section>
            </ScrollReveal>
          )}

          {/* Specials this week */}
          {specials.length > 0 && (
            <ScrollReveal>
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold sm:text-xl">This week&apos;s deals</h2>
                <Link
                  href="/specials"
                  className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline"
                >
                  View all <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="scroll-mask">
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
                {specials.map((item) => {
                  const savings =
                    item.price != null && item.salePrice != null
                      ? item.price - item.salePrice
                      : 0;
                  const storeColor = item.storeId ? `var(--store-${item.storeId})` : undefined;
                  return (
                    <div
                      key={item.storeProductId}
                      className="shrink-0 w-[280px] snap-start rounded-xl border bg-card p-3 flex items-start gap-3 relative overflow-hidden shadow-sm"
                    >
                      {storeColor && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: storeColor }} />
                      )}
                      <ProductImage src={item.imageUrl} alt={item.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-1">
                          {item.storeId && <StoreBadge storeId={item.storeId} size="sm" />}
                          <SaleBadge className="shrink-0 mt-0.5" />
                        </div>
                        <div className="font-semibold text-sm leading-snug line-clamp-2 mt-1">
                          {item.name}
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          {item.salePrice != null && (
                            <span className="font-bold text-savings text-sm">
                              {formatKYD(item.salePrice)}
                            </span>
                          )}
                          {item.price != null && item.salePrice != null && (
                            <span className="text-xs line-through text-muted-foreground">
                              {formatKYD(item.price)}
                            </span>
                          )}
                        </div>
                        {savings > 0.01 && (
                          <span className="inline-block mt-1 text-xs font-semibold text-savings bg-savings/10 rounded-full px-1.5 py-0.5">
                            Save {formatKYD(savings)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
            </section>
            </ScrollReveal>
          )}

          {/* How it works */}
          <ScrollReveal>
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
          </ScrollReveal>

          {/* Feature links */}
          <ScrollReveal>
          <section className="space-y-3">
            <h2 className="text-lg font-bold sm:text-xl">Explore</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
              {FEATURES.map((feature) => (
                <Link
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
                </Link>
              ))}
            </div>
          </section>
          </ScrollReveal>

          {/* Mission */}
          <ScrollReveal>
          <section className="rounded-2xl border bg-gradient-to-br from-card to-muted/30 p-5 sm:p-8 space-y-3 shadow-md ring-1 ring-border/50">
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
          </ScrollReveal>
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

function StatCard({ icon: Icon, target, label }: { icon: typeof Package; target: number; label: string }) {
  const value = useCountUp(target);
  return (
    <div className="rounded-xl border bg-card p-3.5 sm:p-4 text-center shadow-sm">
      <Icon className="h-5 w-5 mx-auto mb-1.5 text-primary/60" />
      <div className="text-xl sm:text-2xl font-bold tabular-nums text-foreground">
        {formatCount(value)}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">
        {label}
      </div>
    </div>
  );
}
