"use client";

import { Fragment, Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ShoppingCart, Check, Minus, ChevronDown } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { formatKYD } from "@/lib/utils/currency";
import { StoreBadge } from "@/components/store-badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/contexts/cart-context";
import { StapleDetailPanel } from "@/components/staple-detail-panel";
import { cn } from "@/lib/utils";

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

const STORES = [
  { id: "fosters", name: "Foster's" },
  { id: "hurleys", name: "Hurley's" },
  { id: "costuless", name: "Cost-U-Less" },
  { id: "pricedright", name: "Priced Right" },
  { id: "shopright", name: "Shopright" },
];

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
  const { refreshCart } = useCart();

  useEffect(() => {
    fetchStaples();
  }, []);

  async function fetchStaples() {
    const res = await fetch("/api/staples");
    const data = await res.json();
    setStaples(data.staples || []);
    setLoading(false);
  }

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

  async function addToCart(stapleId: number) {
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

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <h1 className="text-xl font-bold sm:text-2xl">Everyday Staples</h1>
        <div className="space-y-2 stagger-children">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 skeleton-shimmer rounded-2xl" />
          ))}
        </div>
      </div>
    );
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
        return { storeId: s.id, effective, isOnSale: p.salePrice != null && p.price != null && p.salePrice < p.price, originalPrice: p.price };
      })
      .filter((p) => p.effective != null)
      .sort((a, b) => (a.effective ?? Infinity) - (b.effective ?? Infinity));
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">Everyday Staples</h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
          Compare everyday items across stores. Tap any row for details.{isAdmin && " Click a price to change the matched product."}
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
                      <div className="font-medium text-sm truncate">
                        {r.name}
                      </div>
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

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="mb-6">
          <h2 className="text-lg font-bold mb-2.5 border-b pb-2 sm:text-xl">
            {category}
          </h2>

          {/* ── Mobile: card layout ── */}
          <div className="sm:hidden space-y-2 stagger-children">
            {items.map((staple) => {
              const cheapest = getCheapestStore(staple);
              const isExpanded = expandedId === staple.id;
              const sortedPrices = getSortedPrices(staple);
              const cheapestPrice = sortedPrices[0]?.effective;
              const mostExpensive = sortedPrices[sortedPrices.length - 1]?.effective;
              const savings = cheapestPrice != null && mostExpensive != null ? mostExpensive - cheapestPrice : 0;

              return (
                <div key={staple.id} className="rounded-2xl border bg-card overflow-hidden">
                  <div
                    className={cn(
                      "flex items-center gap-3 p-3 transition-colors active:bg-muted/30 cursor-pointer",
                      isExpanded && "bg-muted/20"
                    )}
                    onClick={() => setExpandedId(isExpanded ? null : staple.id)}
                  >
                    <ProductImage src={getStapleImage(staple)} alt={staple.name} size="md" />

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm leading-tight">{staple.name}</div>
                      {/* Price badges — top 3 */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {sortedPrices.slice(0, 3).map((p, i) => (
                          <div
                            key={p.storeId}
                            className={cn(
                              "flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs",
                              i === 0 ? "bg-savings/10 ring-1 ring-savings/30" : "bg-muted/80"
                            )}
                          >
                            <StoreBadge storeId={p.storeId} size="sm" />
                            <span className={cn("tabular-nums font-medium", i === 0 && "text-savings font-bold")}>
                              {p.effective != null ? formatKYD(p.effective) : "--"}
                            </span>
                          </div>
                        ))}
                        {sortedPrices.length > 3 && (
                          <span className="text-[10px] text-muted-foreground self-center">
                            +{sortedPrices.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {savings > 0.01 && (
                        <span className="text-[10px] font-semibold text-savings bg-savings/10 px-1.5 py-0.5 rounded-full">
                          −{formatKYD(savings)}
                        </span>
                      )}
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

          {/* ── Desktop: table layout ── */}
          <table className="hidden sm:table w-full text-sm table-fixed">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left py-2.5 pl-3 pr-2 font-medium w-[170px]">Item</th>
                {STORES.map((store) => (
                  <th
                    key={store.id}
                    className="text-center py-2.5 px-1 font-medium"
                  >
                    <StoreBadge storeId={store.id} size="sm" />
                  </th>
                ))}
                <th className="py-2.5 px-1 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((staple) => {
                const cheapest = getCheapestStore(staple);
                const isExpanded = expandedId === staple.id;
                return (
                  <Fragment key={staple.id}>
                    <tr
                      className={`border-b transition-colors cursor-pointer ${
                        isExpanded ? "bg-muted/60" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setExpandedId(isExpanded ? null : staple.id)}
                    >
                      <td className="py-2.5 pl-3 pr-2">
                        <div className="flex items-center gap-2">
                          <ProductImage src={getStapleImage(staple)} alt={staple.name} size="sm" />
                          <span className="font-medium text-sm leading-tight">{staple.name}</span>
                          <ChevronDown
                            className={`h-3 w-3 text-muted-foreground/50 transition-transform shrink-0 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </td>
                      {STORES.map((store) => {
                        const p = staple.prices[store.id];
                        const isCheapest = cheapest === store.id;
                        const effectivePrice = p
                          ? p.salePrice ?? p.price
                          : null;

                        return (
                          <td key={store.id} className="py-2.5 px-1 text-center">
                            {p ? (
                              <div
                                onClick={isAdmin ? (e) => {
                                  e.stopPropagation();
                                  setEditing({
                                    stapleId: staple.id,
                                    storeId: store.id,
                                    stapleName: staple.name,
                                  });
                                } : undefined
                                }
                                className={`inline-flex flex-col items-center rounded-md px-1.5 py-1 transition-colors ${
                                  isAdmin ? "cursor-pointer hover:bg-muted" : ""
                                } ${
                                  isCheapest
                                    ? "bg-savings/10 ring-1 ring-savings/30"
                                    : ""
                                }`}
                              >
                                <span
                                  className={`font-semibold tabular-nums text-sm ${
                                    isCheapest
                                      ? "text-savings"
                                      : "text-foreground"
                                  }`}
                                >
                                  {effectivePrice !== null
                                    ? formatKYD(effectivePrice)
                                    : "--"}
                                </span>
                                {p.salePrice !== null &&
                                  p.price !== null &&
                                  p.salePrice < p.price && (
                                    <span className="text-[10px] text-destructive line-through tabular-nums">
                                      {formatKYD(p.price)}
                                    </span>
                                  )}
                                {isAdmin && p.autoMatched && (
                                  <span className="text-[9px] text-amber-600 dark:text-amber-400">
                                    auto
                                  </span>
                                )}
                              </div>
                            ) : isAdmin ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditing({
                                    stapleId: staple.id,
                                    storeId: store.id,
                                    stapleName: staple.name,
                                  });
                                }}
                                className="text-muted-foreground/50 hover:text-primary text-xs hover:underline"
                              >
                                +
                              </button>
                            ) : (
                              <span className="text-muted-foreground/30">
                                <Minus className="h-3.5 w-3.5 inline" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-1 text-center">
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
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <ShoppingCart className="h-3 w-3" />
                          )}
                        </Button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={STORES.length + 2} className="border-b bg-muted/30">
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
      ))}
    </div>
  );
}
