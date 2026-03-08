"use client";

import { useState, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { formatKYD } from "@/lib/utils/currency";
import { useCart } from "@/lib/contexts/cart-context";
import {
  getSearchHistory,
  removeSearchEntry,
  clearSearchHistory,
  getCartSnapshots,
  removeCartSnapshot,
  clearCartHistory,
  type SearchHistoryEntry,
  type CartSnapshotEntry,
} from "@/lib/history";

type Tab = "searches" | "carts";

function timeAgo(timestamp: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(timestamp).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function HistoryPage() {
  const [tab, setTab] = useState<Tab>("searches");
  const [searches, setSearches] = useState<SearchHistoryEntry[]>([]);
  const [snapshots, setSnapshots] = useState<CartSnapshotEntry[]>([]);
  const [expandedCart, setExpandedCart] = useState<string | null>(null);
  const [currentPrices, setCurrentPrices] = useState<
    Record<number, Record<string, number | null>>
  >({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const { refreshCart } = useCart();

  useEffect(() => {
    setSearches(getSearchHistory());
    setSnapshots(getCartSnapshots());
  }, []);

  function handleRemoveSearch(query: string) {
    removeSearchEntry(query);
    setSearches(getSearchHistory());
  }

  function handleClearSearches() {
    clearSearchHistory();
    setSearches([]);
  }

  function handleRemoveSnapshot(id: string) {
    removeCartSnapshot(id);
    setSnapshots(getCartSnapshots());
    if (expandedCart === id) setExpandedCart(null);
  }

  function handleClearCarts() {
    clearCartHistory();
    setSnapshots([]);
    setExpandedCart(null);
  }

  async function handleExpand(snapshot: CartSnapshotEntry) {
    if (expandedCart === snapshot.id) {
      setExpandedCart(null);
      return;
    }
    setExpandedCart(snapshot.id);

    // Fetch current prices for items with productIds
    const productIds = snapshot.items
      .map((i) => i.productId)
      .filter((id): id is number => id != null);

    if (productIds.length > 0 && !loadingPrices) {
      setLoadingPrices(true);
      try {
        const res = await fetch(
          `/api/prices/batch?ids=${productIds.join(",")}`
        );
        const data = await res.json();
        setCurrentPrices((prev) => ({ ...prev, ...data.prices }));
      } catch {
        // Silently fail — prices just won't show deltas
      } finally {
        setLoadingPrices(false);
      }
    }
  }

  async function handleRestore(snapshot: CartSnapshotEntry) {
    setRestoringId(snapshot.id);
    try {
      const productIds = snapshot.items
        .filter((i) => i.productId != null)
        .map((i) => i.productId!);

      for (const productId of productIds) {
        await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
      }

      refreshCart();
      toast.success("Cart restored", {
        description: `${productIds.length} item${productIds.length === 1 ? "" : "s"} added`,
        action: {
          label: "View Cart",
          onClick: () => (window.location.href = "/cart"),
        },
      });
    } catch {
      toast.error("Failed to restore cart");
    } finally {
      setRestoringId(null);
    }
  }

  function getBestPrice(prices: Record<string, number | null>): number | null {
    let best: number | null = null;
    for (const p of Object.values(prices)) {
      if (p != null && (best == null || p < best)) best = p;
    }
    return best;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Shopping History</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Pick up where you left off
        </p>
      </div>

      {/* Tab pills */}
      <div className="flex items-center gap-1">
        {(
          [
            { value: "searches", label: "Recent Searches" },
            { value: "carts", label: "Past Carts" },
          ] as const
        ).map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 active:scale-95 ${
              tab === t.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Recent Searches ── */}
      {tab === "searches" && (
        <div className="space-y-2">
          {searches.length > 0 && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={handleClearSearches}
              >
                Clear all
              </Button>
            </div>
          )}

          {searches.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No recent searches yet"
              description="Search for products and they'll show up here so you can quickly re-run them"
              actionLabel="Start Searching"
              actionHref="/"
            />
          ) : (
            <div className="space-y-1.5 stagger-children">
              {searches.map((entry) => (
                <a
                  key={entry.query}
                  href={`/?q=${encodeURIComponent(entry.query)}`}
                  className="group flex items-center gap-3 rounded-2xl border bg-card p-3 hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.99]"
                >
                  <div className="rounded-lg bg-muted/60 p-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{entry.query}</div>
                    <div className="text-xs text-muted-foreground">
                      {entry.resultCount} result
                      {entry.resultCount === 1 ? "" : "s"} &middot;{" "}
                      {timeAgo(entry.timestamp)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemoveSearch(entry.query);
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Remove search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Past Carts ── */}
      {tab === "carts" && (
        <div className="space-y-2">
          {snapshots.length > 0 && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={handleClearCarts}
              >
                Clear all
              </Button>
            </div>
          )}

          {snapshots.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="No saved carts yet"
              description="Save a cart to track how prices change over time"
              actionLabel="Go to Cart"
              actionHref="/cart"
            />
          ) : (
            <div className="space-y-2 stagger-children">
              {snapshots.map((snapshot) => {
                const isExpanded = expandedCart === snapshot.id;
                const date = new Date(snapshot.timestamp);
                const formattedDate = date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year:
                    date.getFullYear() !== new Date().getFullYear()
                      ? "numeric"
                      : undefined,
                });

                // Calculate current total best price
                let currentTotal: number | null = null;
                const hasCurrentPrices = snapshot.items.some(
                  (i) => i.productId != null && currentPrices[i.productId]
                );
                if (hasCurrentPrices) {
                  currentTotal = 0;
                  for (const item of snapshot.items) {
                    if (item.productId && currentPrices[item.productId]) {
                      const best = getBestPrice(currentPrices[item.productId]);
                      if (best != null) currentTotal += best * item.quantity;
                    }
                  }
                }

                const priceDelta =
                  currentTotal != null
                    ? currentTotal - snapshot.totalBestPrice
                    : null;

                return (
                  <div
                    key={snapshot.id}
                    className="rounded-2xl border bg-card overflow-hidden"
                  >
                    {/* Header */}
                    <button
                      onClick={() => handleExpand(snapshot)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-left"
                    >
                      <div className="rounded-lg bg-muted/60 p-2">
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {formattedDate} &middot; {snapshot.items.length} item
                          {snapshot.items.length === 1 ? "" : "s"}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">
                            Total: {formatKYD(snapshot.totalBestPrice)}
                          </span>
                          {priceDelta != null && priceDelta !== 0 && (
                            <span
                              className={`flex items-center gap-0.5 font-medium ${
                                priceDelta < 0
                                  ? "text-savings"
                                  : "text-destructive"
                              }`}
                            >
                              {priceDelta < 0 ? (
                                <TrendingDown className="h-3 w-3" />
                              ) : (
                                <TrendingUp className="h-3 w-3" />
                              )}
                              {priceDelta < 0 ? "" : "+"}
                              {formatKYD(priceDelta)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="border-t px-3 pb-3 space-y-2">
                        {/* Item list */}
                        <div className="divide-y">
                          {snapshot.items.map((item, idx) => {
                            const snapshotBest = getBestPrice(item.prices);
                            const currentItemPrices =
                              item.productId != null
                                ? currentPrices[item.productId]
                                : null;
                            const currentBest = currentItemPrices
                              ? getBestPrice(currentItemPrices)
                              : null;
                            const itemDelta =
                              snapshotBest != null && currentBest != null
                                ? currentBest - snapshotBest
                                : null;

                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between py-2 gap-2"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm truncate">
                                    {item.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Qty: {item.quantity}
                                    {snapshotBest != null && (
                                      <> &middot; {formatKYD(snapshotBest)}</>
                                    )}
                                  </div>
                                </div>
                                {itemDelta != null && itemDelta !== 0 && (
                                  <span
                                    className={`text-xs font-medium tabular-nums ${
                                      itemDelta < 0
                                        ? "text-savings"
                                        : "text-destructive"
                                    }`}
                                  >
                                    {itemDelta < 0 ? "" : "+"}
                                    {formatKYD(itemDelta)}
                                  </span>
                                )}
                                {currentBest == null &&
                                  item.productId != null &&
                                  hasCurrentPrices && (
                                    <span className="text-xs text-muted-foreground">
                                      Price unavailable
                                    </span>
                                  )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Price comparison summary */}
                        {priceDelta != null && (
                          <div
                            className={`rounded-xl p-3 text-sm ${
                              priceDelta <= 0
                                ? "bg-savings/10 text-savings"
                                : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            <div className="font-medium">
                              {priceDelta <= 0
                                ? `Basket is ${formatKYD(Math.abs(priceDelta))} cheaper now`
                                : `Basket is ${formatKYD(priceDelta)} more expensive now`}
                            </div>
                            <div className="text-xs opacity-80 mt-0.5">
                              Then: {formatKYD(snapshot.totalBestPrice)} &rarr;
                              Now: {formatKYD(currentTotal)}
                            </div>
                          </div>
                        )}

                        {loadingPrices && expandedCart === snapshot.id && (
                          <div className="text-xs text-muted-foreground text-center py-1">
                            Checking current prices...
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            className="flex-1 rounded-xl"
                            onClick={() => handleRestore(snapshot)}
                            disabled={
                              restoringId === snapshot.id ||
                              snapshot.items.every((i) => i.productId == null)
                            }
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            {restoringId === snapshot.id
                              ? "Restoring..."
                              : "Restore Cart"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveSnapshot(snapshot.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
