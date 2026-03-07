"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
import { StoreBadge } from "@/components/store-badge";
import { PriceDisplay } from "@/components/price-display";
import { formatKYD } from "@/lib/utils/currency";
import { CompareDetailDialog } from "@/components/compare-detail-dialog";

const STORE_IDS = ["fosters", "hurleys", "costuless", "pricedright"] as const;

interface CompareItem {
  id: number;
  name: string;
  brand: string | null;
  size: string | null;
  imageUrl: string | null;
  numStores: number;
  minPrice: number;
  maxPrice: number;
  savings: number;
  categoryRaw: string | null;
  prices: Record<string, { price: number | null; salePrice: number | null; productName: string }>;
}

interface CategoryOption {
  name: string;
  count: number;
}

const SORT_OPTIONS = [
  { value: "savings", label: "Biggest Savings" },
  { value: "pct", label: "Biggest % Difference" },
  { value: "name", label: "Name A-Z" },
  { value: "price", label: "Lowest Price" },
];

export default function ComparePage() {
  const [items, setItems] = useState<CompareItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("savings");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const limit = 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      sort,
    });
    if (search) params.set("q", search);
    if (category) params.set("category", category);

    const res = await fetch(`/api/compare?${params}`);
    const data = await res.json();
    setItems(data.items || []);
    setTotal(data.total || 0);
    if (data.categories) setCategories(data.categories);
    setLoading(false);
  }, [page, sort, search, category]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function getCheapestStore(item: CompareItem): string | null {
    let cheapest: string | null = null;
    let cheapestPrice = Infinity;
    for (const storeId of STORE_IDS) {
      const p = item.prices[storeId];
      if (!p) continue;
      const effective = p.salePrice ?? p.price;
      if (effective != null && effective < cheapestPrice) {
        cheapestPrice = effective;
        cheapest = storeId;
      }
    }
    return cheapest;
  }

  const totalPages = Math.ceil(total / limit);

  // Simplify category names for display
  function shortCategory(raw: string): string {
    const parts = raw.split(" / ");
    return parts.length > 2 ? parts.slice(2).join(" / ") : parts[parts.length - 1];
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Price Comparison</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {total.toLocaleString()} products matched across stores &mdash; find the Cheap.ky option
        </p>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-2">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm bg-background"
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="h-9">
            Search
          </Button>
        </form>
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm bg-background h-9"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Category filter chips */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { setCategory(""); setPage(1); }}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              !category ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
            }`}
          >
            All
          </button>
          {categories.slice(0, 15).map((c) => (
            <button
              key={c.name}
              onClick={() => { setCategory(c.name === category ? "" : c.name); setPage(1); }}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                category === c.name ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
              }`}
            >
              {shortCategory(c.name)} ({c.count})
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No matching products found.
        </div>
      ) : (
        <>
          <div className="border rounded-xl overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="py-2.5 px-3 text-left text-sm font-medium max-w-[300px]">Product</th>
                  {STORE_IDS.map((id) => (
                    <th key={id} className="py-2.5 px-2 text-center text-sm font-medium hidden sm:table-cell">
                      <StoreBadge storeId={id} />
                    </th>
                  ))}
                  <th className="py-2.5 px-2 text-center text-sm font-medium">Best</th>
                  <th className="py-2.5 px-2 text-right text-sm font-medium w-20">
                    <span className="hidden sm:inline">You Save</span>
                    <span className="sm:hidden">Save</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const cheapest = getCheapestStore(item);
                  const savingsPct = item.minPrice > 0
                    ? Math.round((item.savings / item.maxPrice) * 100)
                    : 0;

                  return (
                    <tr key={item.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-3 max-w-[300px]">
                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => setSelectedProductId(item.id)}
                        >
                          <ProductImage src={item.imageUrl} alt={item.name} size="sm" />
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate max-w-[220px]">{item.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {[item.brand, item.size].filter(Boolean).join(" - ")}
                            </div>
                            {/* Mobile: show cheapest store + price */}
                            {cheapest && (
                              <div className="sm:hidden text-xs mt-0.5">
                                <span className="font-bold text-savings">{formatKYD(item.minPrice)}</span>
                                {" "}at <StoreBadge storeId={cheapest} />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      {STORE_IDS.map((storeId) => {
                        const p = item.prices[storeId];
                        const isCheapest = storeId === cheapest;
                        return (
                          <td key={storeId} className="py-3 px-2 text-center text-sm hidden sm:table-cell">
                            <PriceDisplay
                              price={p?.price ?? null}
                              salePrice={p?.salePrice ?? null}
                              isCheapest={isCheapest}
                            />
                          </td>
                        );
                      })}
                      <td className="py-3 px-2 text-center hidden sm:table-cell">
                        {cheapest && (
                          <div>
                            <div className="text-sm font-bold text-savings tabular-nums">
                              {formatKYD(item.minPrice)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              <StoreBadge storeId={cheapest} />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {item.savings > 0 && (
                          <div>
                            <div className="text-sm font-bold text-savings tabular-nums">
                              {formatKYD(item.savings)}
                            </div>
                            {savingsPct > 0 && (
                              <div className="text-[10px] text-muted-foreground">
                                {savingsPct}% less
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total.toLocaleString()} products)
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      <CompareDetailDialog
        productId={selectedProductId}
        onClose={() => setSelectedProductId(null)}
      />
    </div>
  );
}
