"use client";

import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
import { StoreBadge } from "@/components/store-badge";
import { PriceDisplay } from "@/components/price-display";
import { PriceChangeIndicator } from "@/components/price-change-indicator";
import { StalenessBadge, getStalenessInfo } from "@/components/staleness-badge";
import { FavouriteButton } from "@/components/favourite-button";
import { formatKYD } from "@/lib/utils/currency";

const STORE_IDS = ["fosters", "hurleys", "kirkmarket", "costuless", "pricedright", "shopright"] as const;

interface ProductCardProps {
  id: number;
  name: string;
  brand: string | null;
  size: string | null;
  imageUrl: string | null;
  prices: Record<string, { price: number | null; salePrice: number | null; updatedAt?: string | null; unitPrice?: string | null; matchQuality?: string }>;
  priceChanges?: Record<string, { direction: "up" | "down"; amount: number }>;
  minPrice?: number | null;
  onAddToCart?: (productId: number) => void;
  onClickProduct?: (productId: number) => void;
  style?: React.CSSProperties;
}

export function ProductCard({ id, name, brand, size, imageUrl, prices, priceChanges, minPrice: _minPrice, onAddToCart, onClickProduct, style }: ProductCardProps) {
  const [added, setAdded] = useState(false);

  let cheapestStore: string | null = null;
  let cheapestPrice = Infinity;
  let expensivePrice = 0;
  let storeCount = 0;
  for (const storeId of STORE_IDS) {
    const p = prices[storeId];
    if (!p) continue;
    const effective = p.salePrice ?? p.price;
    if (effective != null) {
      storeCount++;
      if (effective < cheapestPrice) {
        cheapestPrice = effective;
        cheapestStore = storeId;
      }
      if (effective > expensivePrice) {
        expensivePrice = effective;
      }
    }
  }

  const savings = storeCount >= 2 ? expensivePrice - cheapestPrice : 0;

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onAddToCart || id <= 0) return;
    onAddToCart(id);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div
      className="group relative flex items-start gap-3 rounded-2xl border bg-card p-3 transition-all duration-200 active:scale-[0.98]"
      style={style}
      onClick={() => id > 0 && onClickProduct?.(id)}
    >
      {/* Product image */}
      <div className="shrink-0 relative">
        <ProductImage src={imageUrl} alt={name} size="lg" />
        {savings > 0.01 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-savings text-white text-[9px] font-bold px-1.5 py-0.5 leading-none shadow-sm">
            −{formatKYD(savings)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm leading-snug line-clamp-2">{name}</div>
        {(brand || size) && (
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {[brand, size].filter(Boolean).join(" · ")}
          </div>
        )}

        {/* Store prices */}
        <div className="flex flex-wrap gap-1 mt-2">
          {STORE_IDS.map((storeId) => {
            const p = prices[storeId];
            const effective = p?.salePrice ?? p?.price;
            if (effective == null) return null;
            const isCheapest = storeId === cheapestStore;
            return (
              <div
                key={storeId}
                className={`flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs transition-colors ${
                  isCheapest ? "bg-savings/10 ring-1 ring-savings/30" : "bg-muted/80"
                }`}
              >
                <StoreBadge storeId={storeId} size="sm" />
                <PriceDisplay price={p?.price} salePrice={p?.salePrice} isCheapest={isCheapest} unitPrice={p?.unitPrice} matchQuality={p?.matchQuality} />
                {priceChanges?.[storeId] && (
                  <PriceChangeIndicator direction={priceChanges[storeId].direction} amount={priceChanges[storeId].amount} />
                )}
                {p?.updatedAt && getStalenessInfo(p.updatedAt).level !== "fresh" && (
                  <StalenessBadge updatedAt={p.updatedAt} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      {id > 0 && (
        <div className="flex flex-col items-center gap-0.5 shrink-0 mt-1">
          <FavouriteButton productId={id} />
          {onAddToCart && (
            <Button
              size="icon-sm"
              variant={added ? "secondary" : "outline"}
              onClick={handleAdd}
              className={`transition-all duration-200 ${added ? "bg-savings/10 border-savings/30" : ""}`}
            >
              {added ? (
                <Check className="h-3.5 w-3.5 text-savings animate-check-pop" />
              ) : (
                <ShoppingCart className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
