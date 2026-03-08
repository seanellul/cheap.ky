"use client";

import { useState, useEffect, useCallback } from "react";
import { Heart } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { StoreBadge } from "@/components/store-badge";
import { PriceDisplay } from "@/components/price-display";
import { FavouriteButton } from "@/components/favourite-button";
import { useFavourites } from "@/lib/contexts/favourites-context";
import { formatKYD } from "@/lib/utils/currency";

const STORE_IDS = ["fosters", "hurleys", "kirkmarket", "costuless", "pricedright", "shopright"] as const;

interface FavItem {
  id: number;
  name: string;
  brand: string | null;
  size: string | null;
  imageUrl: string | null;
  prices: Record<string, { price: number | null; salePrice: number | null; updatedAt: string | null }>;
  cheapestStore: string | null;
  cheapestPrice: number | null;
  storeCount: number;
}

export default function FavouritesPage() {
  const { favouriteIds, count } = useFavourites();
  const [items, setItems] = useState<FavItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavourites = useCallback(async () => {
    if (favouriteIds.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/favourites?ids=${favouriteIds.join(",")}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [favouriteIds]);

  useEffect(() => {
    fetchFavourites();
  }, [fetchFavourites]);

  // Filter out items that have been un-favourited
  const visibleItems = items.filter((item) => favouriteIds.includes(item.id));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Favourites</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {count === 0
            ? "Pin products you buy regularly for quick access"
            : `${count} saved item${count !== 1 ? "s" : ""}`}
        </p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-2xl" />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <div>
            <p className="font-medium text-muted-foreground">No favourites yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Tap the heart icon on any product to save it here
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-2xl border bg-card p-3"
            >
              <div className="shrink-0">
                <ProductImage src={item.imageUrl} alt={item.name} size="lg" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm leading-snug line-clamp-2">{item.name}</div>
                {(item.brand || item.size) && (
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {[item.brand, item.size].filter(Boolean).join(" · ")}
                  </div>
                )}
                {item.cheapestPrice != null && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-sm font-bold text-savings tabular-nums">
                      {formatKYD(item.cheapestPrice)}
                    </span>
                    {item.cheapestStore && (
                      <span className="text-xs text-muted-foreground">
                        at <StoreBadge storeId={item.cheapestStore} size="sm" />
                      </span>
                    )}
                  </div>
                )}
                {/* All store prices */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {STORE_IDS.map((storeId) => {
                    const p = item.prices[storeId];
                    const effective = p?.salePrice ?? p?.price;
                    if (effective == null) return null;
                    const isCheapest = storeId === item.cheapestStore;
                    return (
                      <div
                        key={storeId}
                        className={`flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs transition-colors ${
                          isCheapest ? "bg-savings/10 ring-1 ring-savings/30" : "bg-muted/80"
                        }`}
                      >
                        <StoreBadge storeId={storeId} size="sm" />
                        <PriceDisplay price={p?.price} salePrice={p?.salePrice} isCheapest={isCheapest} />
                      </div>
                    );
                  })}
                </div>
              </div>
              <FavouriteButton productId={item.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
