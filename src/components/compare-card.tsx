"use client";

import { ProductImage } from "@/components/product-image";
import { StoreBadge } from "@/components/store-badge";
import { PriceDisplay } from "@/components/price-display";
import { PriceChangeIndicator } from "@/components/price-change-indicator";
import { StalenessBadge } from "@/components/staleness-badge";
import { formatKYD } from "@/lib/utils/currency";

const STORE_IDS = ["fosters", "hurleys", "costuless", "pricedright", "shopright"] as const;

interface CompareCardProps {
  id: number;
  name: string;
  brand: string | null;
  size: string | null;
  imageUrl: string | null;
  minPrice: number;
  savings: number;
  maxPrice: number;
  prices: Record<string, { price: number | null; salePrice: number | null; productName: string; updatedAt?: string | null }>;
  priceChanges?: Record<string, { direction: "up" | "down"; amount: number }>;
  onClick?: () => void;
}

export function CompareCard({ name, brand, size, imageUrl, minPrice, savings, maxPrice, prices, priceChanges, onClick }: CompareCardProps) {
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

  const savingsPct = minPrice > 0 ? Math.round((savings / maxPrice) * 100) : 0;

  return (
    <div
      className="rounded-2xl border bg-card p-3 space-y-2 cursor-pointer transition-all duration-200 active:scale-[0.98] hover:bg-muted/30"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 relative">
          <ProductImage src={imageUrl} alt={name} size="md" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm leading-snug line-clamp-2">{name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {[brand, size].filter(Boolean).join(" · ")}
          </div>
        </div>
        {savings > 0 && (
          <div className="text-right shrink-0">
            <div className="text-sm font-bold text-savings tabular-nums">
              {formatKYD(savings)}
            </div>
            {savingsPct > 0 && (
              <div className="text-[10px] text-muted-foreground">{savingsPct}% less</div>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
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
              <PriceDisplay price={p?.price} salePrice={p?.salePrice} isCheapest={isCheapest} />
              {priceChanges?.[storeId] && (
                <PriceChangeIndicator direction={priceChanges[storeId].direction} amount={priceChanges[storeId].amount} />
              )}
              <StalenessBadge updatedAt={p?.updatedAt} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
