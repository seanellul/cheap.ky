"use client";

import { Fragment, Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ShoppingCart, Check, Minus, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { ProductImage } from "@/components/product-image";
import { formatKYD } from "@/lib/utils/currency";
import { StoreBadge } from "@/components/store-badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/contexts/cart-context";
import { StapleDetailPanel } from "@/components/staple-detail-panel";
import { CategoryStrip, type CategoryConfig } from "@/components/category-strip";
import { AisleSection } from "@/components/aisle-section";
import { cn } from "@/lib/utils";
import { trackStapleExpand, trackStapleAddToCart, trackBatchAddToCart } from "@/lib/analytics";

// ── Types ──

interface StaplePrice {
  productId: number;
  productName: string;
  price: number | null;
  salePrice: number | null;
  size: string | null;
  imageUrl: string | null;
  autoMatched: boolean | null;
}

interface Staple {
  id: number;
  name: string;
  category: string;
  prices: Record<string, StaplePrice>;
}

interface SearchResult {
  id: number;
  name: string;
  price: number | null;
  salePrice: number | null;
  size: string | null;
  imageUrl: string | null;
  categoryRaw: string | null;
}

// ── Constants ──

const STORES = [
  { id: "fosters", name: "Foster's" },
  { id: "hurleys", name: "Hurley's" },
  { id: "costuless", name: "Cost-U-Less" },
  { id: "pricedright", name: "Priced Right" },
  { id: "shopright", name: "Shopright" },
];

const STORE_NAMES: Record<string, string> = {
  fosters: "Foster's",
  hurleys: "Hurley's",
  costuless: "Cost-U-Less",
  pricedright: "Priced Right",
  shopright: "Shopright",
};

const CATEGORIES: CategoryConfig[] = [
  { key: "Produce", emoji: "\u{1F96C}", slug: "produce", accent: "border-l-green-500" },
  { key: "Meat & Poultry", emoji: "\u{1F969}", slug: "meat-poultry", accent: "border-l-red-400" },
  { key: "Seafood", emoji: "\u{1F41F}", slug: "seafood", accent: "border-l-blue-400" },
  { key: "Dairy & Eggs", emoji: "\u{1F9C0}", slug: "dairy-eggs", accent: "border-l-amber-300" },
  { key: "Bakery & Pantry", emoji: "\u{1F35E}", slug: "bakery-pantry", accent: "border-l-orange-400" },
  { key: "Beverages", emoji: "\u{1F964}", slug: "beverages", accent: "border-l-cyan-400" },
  { key: "Pet", emoji: "\u{1F43E}", slug: "pet", accent: "border-l-purple-400" },
  { key: "Household", emoji: "\u{1F9F9}", slug: "household", accent: "border-l-slate-400" },
];

// ── Helpers ──

function getCheapestStore(staple: Staple): string | null {
  let cheapest: string | null = null;
  let cheapestPrice = Infinity;
  for (const store of STORES) {
    const p = staple.prices[store.id];
    if (p) {
      const effectivePrice = p.salePrice ?? p.price;
      if (effectivePrice !== null && effectivePrice < cheapestPrice) {
        cheapestPrice = effectivePrice;
        cheapest = store.id;
      }
    }
  }
  return cheapest;
}

function getSortedPrices(staple: Staple) {
  return STORES
    .filter((s) => staple.prices[s.id])
    .map((s) => {
      const p = staple.prices[s.id];
      const effective = p.salePrice ?? p.price;
      return {
        storeId: s.id,
        effective,
        isOnSale: p.salePrice != null && p.price != null && p.salePrice < p.price,
        originalPrice: p.price,
      };
    })
    .filter((p) => p.effective != null)
    .sort((a, b) => (a.effective ?? Infinity) - (b.effective ?? Infinity));
}

function getStapleImage(staple: Staple): string | null {
  const cheapest = getCheapestStore(staple);
  if (cheapest && staple.prices[cheapest]?.imageUrl) {
    return staple.prices[cheapest].imageUrl;
  }
  for (const store of STORES) {
    const img = staple.prices[store.id]?.imageUrl;
    if (img) return img;
  }
  return null;
}

function getWinnerSummary(items: Staple[]): string {
  const wins = getStoreWins(items);
  if (wins.length === 0) return "";
  const total = wins.reduce((sum, w) => sum + w.wins, 0);
  const name = STORE_NAMES[wins[0].storeId] || wins[0].storeId;
  return `${name} wins ${wins[0].wins} of ${total}`;
}

function getStoreWins(items: Staple[]): { storeId: string; wins: number }[] {
  const wins: Record<string, number> = {};
  for (const item of items) {
    const cheapest = getCheapestStore(item);
    if (cheapest) {
      wins[cheapest] = (wins[cheapest] || 0) + 1;
    }
  }
  return Object.entries(wins)
    .map(([storeId, count]) => ({ storeId, wins: count }))
    .sort((a, b) => b.wins - a.wins);
}

// ── Page ──

export default function StaplesPageWrapper() {
  return (
    <Suspense>
      <StaplesPage />
    </Suspense>
  );
}

function StaplesPage() {
  const searchParams = useSearchParams();
  const isAdmin = searchParams.get("admin") === "1";
  const [staples, setStaples] = useState<Staple[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{
    stapleId: number;
    storeId: string;
    stapleName: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].key);
  const [batchAddingCategory, setBatchAddingCategory] = useState<string | null>(null);
  const { refreshCart } = useCart();

  // Scroll-spy
  const isProgrammaticScroll = useRef(false);

  useEffect(() => {
    const sections = CATEGORIES.map((c) => document.getElementById(c.slug)).filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScroll.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cat = CATEGORIES.find((c) => c.slug === entry.target.id);
            if (cat) setActiveCategory(cat.key);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [loading]);

  const handleCategorySelect = useCallback((key: string) => {
    const cat = CATEGORIES.find((c) => c.key === key);
    if (!cat) return;
    setActiveCategory(key);
    // Ensure section is open
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    isProgrammaticScroll.current = true;
    document.getElementById(cat.slug)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 800);
  }, []);

  // Data fetching
  useEffect(() => {
    fetchStaples();
  }, []);

  async function fetchStaples() {
    const res = await fetch("/api/staples");
    const data = await res.json();
    setStaples(data.staples || []);
    setLoading(false);
  }

  // Admin search/link
  async function handleSearch() {
    if (!editing || !searchQuery.trim()) return;
    setSearching(true);
    const res = await fetch("/api/staples", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stapleId: editing.stapleId,
        storeId: editing.storeId,
        query: searchQuery,
      }),
    });
    const data = await res.json();
    setSearchResults(data.results || []);
    setSearching(false);
  }

  async function handleLink(storeProductId: number) {
    if (!editing) return;
    await fetch("/api/staples", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stapleId: editing.stapleId,
        storeId: editing.storeId,
        storeProductId,
      }),
    });
    setEditing(null);
    setSearchQuery("");
    setSearchResults([]);
    fetchStaples();
  }

  // Cart actions
  async function addToCart(stapleId: number) {
    const staple = staples.find((s) => s.id === stapleId);
    if (staple) trackStapleAddToCart(staple.name);
    await fetch("/api/smart-cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stapleId }),
    });
    setAddedIds((prev) => new Set(prev).add(stapleId));
    refreshCart();
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(stapleId);
        return next;
      });
    }, 1500);
  }

  async function addAllCheapest(category: string) {
    const items = grouped[category];
    if (!items || items.length === 0) return;
    setBatchAddingCategory(category);
    const stapleIds = items.map((s) => s.id);
    trackBatchAddToCart(category, stapleIds.length);
    await fetch("/api/smart-cart/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stapleIds }),
    });
    setAddedIds((prev) => {
      const next = new Set(prev);
      stapleIds.forEach((id) => next.add(id));
      return next;
    });
    refreshCart();
    toast.success(`Added ${stapleIds.length} ${category} items to cart`);
    setBatchAddingCategory(null);
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        stapleIds.forEach((id) => next.delete(id));
        return next;
      });
    }, 2000);
  }

  function toggleSection(key: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Group by category
  const grouped = staples.reduce(
    (acc, s) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(s);
      return acc;
    },
    {} as Record<string, Staple[]>
  );

  // ── Loading skeleton — show real pills + section headers with shimmer ──
  if (loading) {
    return (
      <div className="-mx-4 -mt-4 md:-mt-6">
        <CategoryStrip
          categories={CATEGORIES}
          activeCategory={activeCategory}
          onSelect={handleCategorySelect}
        />
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="mb-5">
            <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">Everyday Staples</h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              Compare everyday items across stores. Tap any row for details.
            </p>
          </div>
          <div className="space-y-3 stagger-children">
            {CATEGORIES.map((cat) => (
              <div key={cat.key} className="space-y-2">
                <div className={cn("flex items-center gap-3 px-3 py-3 rounded-xl border-l-4", cat.accent)}>
                  <span className="text-xl">{cat.emoji}</span>
                  <h2 className="font-bold text-base sm:text-lg">{cat.key}</h2>
                  <div className="h-5 w-8 skeleton-shimmer rounded-full" />
                  <div className="flex-1" />
                  <div className="h-4 w-4 skeleton-shimmer rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-4 md:-mt-6">
      {/* Sticky category nav */}
      <CategoryStrip
        categories={CATEGORIES.filter((c) => grouped[c.key]?.length)}
        activeCategory={activeCategory}
        onSelect={handleCategorySelect}
      />

      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className="mb-5">
          <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">Everyday Staples</h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Compare everyday items across stores. Tap any row for details.
            {isAdmin && " Click a price to change the matched product."}
          </p>
        </div>

        {/* Edit modal */}
        {editing && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-card text-card-foreground rounded-t-2xl sm:rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-auto p-5 border pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5">
              <div className="mx-auto w-10 h-1 rounded-full bg-muted-foreground/20 mb-4 sm:hidden" />
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold leading-tight">
                  Change product for &quot;{editing.stapleName}&quot; at{" "}
                  {STORES.find((s) => s.id === editing.storeId)?.name}
                </h2>
                <button
                  onClick={() => {
                    setEditing(null);
                    setSearchResults([]);
                    setSearchQuery("");
                  }}
                  className="text-muted-foreground hover:text-foreground text-xl shrink-0 ml-2"
                >
                  &times;
                </button>
              </div>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1 border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground"
                  autoFocus
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {searching ? "..." : "Search"}
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleLink(r.id)}
                      className="w-full text-left border rounded-xl p-3 hover:bg-muted active:scale-[0.98] flex items-center gap-3 transition-all"
                    >
                      {r.imageUrl && (
                        <img
                          src={r.imageUrl}
                          alt=""
                          className="w-10 h-10 object-contain rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{r.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.size} &middot; {r.categoryRaw}
                        </div>
                      </div>
                      <div className="font-semibold text-sm tabular-nums">
                        {r.price !== null ? formatKYD(r.price) : "--"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchResults.length === 0 && searchQuery && !searching && (
                <p className="text-sm text-muted-foreground">
                  No results. Try different keywords.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Aisle sections */}
        {CATEGORIES.filter((c) => grouped[c.key]?.length).map((cat) => {
          const items = grouped[cat.key];
          return (
            <AisleSection
              key={cat.key}
              category={cat}
              itemCount={items.length}
              isOpen={openSections.has(cat.key)}
              onToggle={() => toggleSection(cat.key)}
              winnerSummary={getWinnerSummary(items)}
              storeWins={getStoreWins(items)}
              onAddAll={() => addAllCheapest(cat.key)}
              isAddingAll={batchAddingCategory === cat.key}
            >
              {/* Mobile cards */}
              <div className="sm:hidden space-y-2 stagger-children">
                {items.map((staple) => {
                  const cheapest = getCheapestStore(staple);
                  const isExpanded = expandedId === staple.id;
                  const sortedPrices = getSortedPrices(staple);

                  return (
                    <div key={staple.id} className="rounded-2xl border bg-card overflow-hidden">
                      {/* Winner bar */}
                      {cheapest && (
                        <div
                          className="h-[3px]"
                          style={{ backgroundColor: `var(--store-${cheapest})` }}
                        />
                      )}

                      <div
                        className={cn(
                          "flex items-center gap-3 p-3 transition-colors active:bg-muted/30 cursor-pointer",
                          isExpanded && "bg-muted/20"
                        )}
                        onClick={() => {
                          if (!isExpanded) trackStapleExpand(staple.name);
                          setExpandedId(isExpanded ? null : staple.id);
                        }}
                      >
                        <ProductImage src={getStapleImage(staple)} alt={staple.name} size="md" />

                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm leading-tight">{staple.name}</div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant={addedIds.has(staple.id) ? "default" : "outline"}
                            size="icon-sm"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(staple.id);
                            }}
                            disabled={addedIds.has(staple.id)}
                          >
                            {addedIds.has(staple.id) ? (
                              <Check className="h-3.5 w-3.5 animate-check-pop" />
                            ) : (
                              <ShoppingCart className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-muted-foreground/40 transition-transform duration-200",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </div>
                      </div>

                      {/* Horizontally scrollable price chips */}
                      <div className="overflow-x-auto scrollbar-hide flex gap-1.5 px-3 pb-3">
                        {sortedPrices.map((p, i) => (
                          <div
                            key={p.storeId}
                            className={cn(
                              "flex items-center gap-1 rounded-lg px-2 py-1 text-xs shrink-0",
                              i === 0
                                ? "bg-savings/10 ring-1 ring-savings/30"
                                : "bg-muted/80"
                            )}
                          >
                            <StoreBadge storeId={p.storeId} size="sm" />
                            <span
                              className={cn(
                                "tabular-nums font-medium",
                                i === 0 && "text-savings font-bold"
                              )}
                            >
                              {p.effective != null ? formatKYD(p.effective) : "--"}
                            </span>
                            {p.isOnSale && (
                              <span className="text-[10px] text-destructive line-through tabular-nums">
                                {p.originalPrice != null ? formatKYD(p.originalPrice) : ""}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {isExpanded && (
                        <div className="border-t">
                          <StapleDetailPanel
                            name={staple.name}
                            prices={staple.prices}
                            stores={STORES}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="py-2.5 px-3 text-left font-medium">Product</th>
                      {STORES.map((s) => (
                        <th key={s.id} className="py-2.5 px-2 text-center font-medium">
                          <StoreBadge storeId={s.id} />
                        </th>
                      ))}
                      <th className="py-2.5 px-2 w-14" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((staple) => {
                      const cheapest = getCheapestStore(staple);
                      const isExpanded = expandedId === staple.id;

                      return (
                        <Fragment key={staple.id}>
                          <tr
                            className={cn(
                              "border-b cursor-pointer transition-colors",
                              isExpanded ? "bg-muted/20" : "hover:bg-muted/30"
                            )}
                            onClick={() => {
                              if (!isExpanded) trackStapleExpand(staple.name);
                              setExpandedId(isExpanded ? null : staple.id);
                            }}
                          >
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <ProductImage src={getStapleImage(staple)} alt={staple.name} size="sm" />
                                <span className="font-medium leading-tight">{staple.name}</span>
                                <ChevronDown
                                  className={cn(
                                    "h-3.5 w-3.5 text-muted-foreground/40 shrink-0 transition-transform duration-200",
                                    isExpanded && "rotate-180"
                                  )}
                                />
                              </div>
                            </td>

                            {STORES.map((s) => {
                              const p = staple.prices[s.id];
                              const effective = p ? (p.salePrice ?? p.price) : null;
                              const isCheapest = s.id === cheapest;
                              const isOnSale = p && p.salePrice != null && p.price != null && p.salePrice < p.price;

                              return (
                                <td
                                  key={s.id}
                                  className="py-2.5 px-2 text-center"
                                  onClick={
                                    isAdmin
                                      ? (e) => {
                                          e.stopPropagation();
                                          setEditing({
                                            stapleId: staple.id,
                                            storeId: s.id,
                                            stapleName: staple.name,
                                          });
                                        }
                                      : undefined
                                  }
                                >
                                  {effective != null ? (
                                    <div
                                      className={cn(
                                        "inline-flex flex-col items-center rounded-md px-1.5 py-0.5",
                                        isCheapest && "bg-savings/10 ring-1 ring-savings/30",
                                        isAdmin && "cursor-pointer hover:bg-muted"
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "font-semibold tabular-nums",
                                          isCheapest ? "text-savings" : "text-foreground"
                                        )}
                                      >
                                        {formatKYD(effective)}
                                      </span>
                                      {isOnSale && (
                                        <span className="text-[10px] text-destructive line-through tabular-nums">
                                          {formatKYD(p.price!)}
                                        </span>
                                      )}
                                    </div>
                                  ) : isAdmin ? (
                                    <span className="text-muted-foreground/50 hover:text-primary text-xs cursor-pointer">+</span>
                                  ) : (
                                    <span className="text-muted-foreground/30">&mdash;</span>
                                  )}
                                </td>
                              );
                            })}

                            <td className="py-2.5 px-2 text-center">
                              <Button
                                variant={addedIds.has(staple.id) ? "default" : "outline"}
                                size="icon-sm"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(staple.id);
                                }}
                                disabled={addedIds.has(staple.id)}
                              >
                                {addedIds.has(staple.id) ? (
                                  <Check className="h-3.5 w-3.5 animate-check-pop" />
                                ) : (
                                  <ShoppingCart className="h-3 w-3" />
                                )}
                              </Button>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="border-b">
                              <td colSpan={STORES.length + 2} className="p-0 bg-muted/10">
                                <StapleDetailPanel
                                  name={staple.name}
                                  prices={staple.prices}
                                  stores={STORES}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </AisleSection>
          );
        })}
      </div>
    </div>
  );
}
