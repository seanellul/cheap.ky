"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { formatKYD } from "@/lib/utils/currency";
import { StoreBadge } from "@/components/store-badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/contexts/cart-context";

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

export default function StaplesPage() {
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

  if (loading) return <div className="p-8 text-muted-foreground">Loading staples...</div>;

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
    // Prefer cheapest store's image, fall back to first available
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

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">Everyday Staples</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Compare everyday items across stores. Click a price to change the matched product.
        </p>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-auto p-6 border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                Change product for &quot;{editing.stapleName}&quot; at{" "}
                {STORES.find((s) => s.id === editing.storeId)?.name}
              </h2>
              <button
                onClick={() => {
                  setEditing(null);
                  setSearchResults([]);
                  setSearchQuery("");
                }}
                className="text-muted-foreground hover:text-foreground text-xl"
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
                className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background text-foreground"
                autoFocus
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50"
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
                    className="w-full text-left border rounded-lg p-3 hover:bg-muted flex items-center gap-3 transition-colors"
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
        <div key={category} className="mb-8">
          <h2 className="text-xl font-semibold mb-3 border-b pb-2">
            {category}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left py-2.5 pr-4 font-medium w-48">Item</th>
                  {STORES.map((store) => (
                    <th
                      key={store.id}
                      className="text-left py-2.5 px-3 font-medium"
                    >
                      <StoreBadge storeId={store.id} />
                    </th>
                  ))}
                  <th className="py-2.5 px-2 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((staple) => {
                  const cheapest = getCheapestStore(staple);
                  return (
                    <tr key={staple.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <ProductImage src={getStapleImage(staple)} alt={staple.name} size="sm" />
                          <span className="font-medium">{staple.name}</span>
                        </div>
                      </td>
                      {STORES.map((store) => {
                        const p = staple.prices[store.id];
                        const isCheapest = cheapest === store.id;
                        const effectivePrice = p
                          ? p.salePrice ?? p.price
                          : null;

                        return (
                          <td key={store.id} className="py-3 px-3">
                            {p ? (
                              <button
                                onClick={() =>
                                  setEditing({
                                    stapleId: staple.id,
                                    storeId: store.id,
                                    stapleName: staple.name,
                                  })
                                }
                                className={`text-left w-full rounded-lg p-2 -m-2 hover:bg-muted transition-colors ${
                                  isCheapest
                                    ? "bg-savings/10 ring-1 ring-savings/30"
                                    : ""
                                }`}
                              >
                                <div
                                  className={`font-semibold tabular-nums ${
                                    isCheapest
                                      ? "text-savings"
                                      : "text-foreground"
                                  }`}
                                >
                                  {effectivePrice !== null
                                    ? formatKYD(effectivePrice)
                                    : "--"}
                                  {p.salePrice !== null &&
                                    p.price !== null &&
                                    p.salePrice < p.price && (
                                      <span className="ml-1 text-xs text-destructive line-through">
                                        {formatKYD(p.price)}
                                      </span>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                                  {p.productName}
                                </div>
                                {p.size && (
                                  <div className="text-xs text-muted-foreground/70">
                                    {p.size}
                                  </div>
                                )}
                                {p.autoMatched && (
                                  <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                                    auto-matched
                                  </div>
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  setEditing({
                                    stapleId: staple.id,
                                    storeId: store.id,
                                    stapleName: staple.name,
                                  })
                                }
                                className="text-muted-foreground/50 hover:text-primary text-xs hover:underline"
                              >
                                + Link product
                              </button>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3 px-2 text-center">
                        <Button
                          variant={addedIds.has(staple.id) ? "default" : "outline"}
                          size="icon-sm"
                          className="h-8 w-8"
                          onClick={() => addToCart(staple.id)}
                          disabled={addedIds.has(staple.id)}
                        >
                          {addedIds.has(staple.id) ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <ShoppingCart className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
