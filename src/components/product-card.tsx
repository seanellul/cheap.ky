"use client";

import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
import { StoreBadge } from "@/components/store-badge";
import { PriceDisplay } from "@/components/price-display";

const STORE_IDS = ["fosters", "hurleys", "kirkmarket", "costuless", "pricedright", "shopright"] as const;

interface ProductCardProps {
  id: number;
  name: string;
  brand: string | null;
  size: string | null;
  imageUrl: string | null;
  prices: Record<string, { price: number | null; salePrice: number | null }>;
  minPrice?: number | null;
  onAddToCart?: (productId: number) => void;
  onClickProduct?: (productId: number) => void;
  style?: React.CSSProperties;
}

export function ProductCard({ id, name, brand, size, imageUrl, prices, minPrice: _minPrice, onAddToCart, onClickProduct, style }: ProductCardProps) {
  const [added, setAdded] = useState(false);

  let cheapestStore: string | null = null;
  let cheapestPrice = Infinity;
  for (const storeId of STORE_IDS) {
    const p = prices[storeId];
    if (!p) continue;
    const effective = p.salePrice ?? p.price;
    if (effective != null && effective < cheapestPrice) {
      cheapestPrice = effective;
      cheapestStore = storeId;
    }
  }

  function handleAdd() {
    if (!onAddToCart || id <= 0) return;
    onAddToCart(id);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div
      className="flex items-start gap-3 rounded-xl border bg-card p-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
      style={style}
    >
      <button
        type="button"
        className="shrink-0"
        onClick={() => id > 0 && onClickProduct?.(id)}
        disabled={id <= 0 || !onClickProduct}
      >
        <ProductImage src={imageUrl} alt={name} size="lg" />
      </button>
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => id > 0 && onClickProduct?.(id)}
      >
        <div className="font-medium text-sm leading-tight line-clamp-2">{name}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {[brand, size].filter(Boolean).join(" - ")}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {STORE_IDS.map((storeId) => {
            const p = prices[storeId];
            const effective = p?.salePrice ?? p?.price;
            if (effective == null) return null;
            const isCheapest = storeId === cheapestStore;
            return (
              <div
                key={storeId}
                className={`flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs ${
                  isCheapest ? "bg-savings/10 ring-1 ring-savings/30" : "bg-muted"
                }`}
              >
                <StoreBadge storeId={storeId} size="sm" />
                <PriceDisplay price={p?.price} salePrice={p?.salePrice} isCheapest={isCheapest} />
              </div>
            );
          })}
        </div>
      </div>
      {id > 0 && onAddToCart && (
        <Button
          size="icon-sm"
          variant={added ? "secondary" : "outline"}
          onClick={handleAdd}
          className="shrink-0 mt-1 transition-all duration-200"
        >
          {added ? <Check className="h-3.5 w-3.5 text-savings" /> : <ShoppingCart className="h-3.5 w-3.5" />}
        </Button>
      )}
    </div>
  );
}
