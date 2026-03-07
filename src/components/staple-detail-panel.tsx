"use client";

import { ProductImage } from "@/components/product-image";
import { StoreBadge } from "@/components/store-badge";
import { formatKYD } from "@/lib/utils/currency";

interface StaplePrice {
  productId: number;
  productName: string;
  price: number | null;
  salePrice: number | null;
  size: string | null;
  imageUrl: string | null;
  autoMatched: boolean | null;
}

interface StapleDetailPanelProps {
  name: string;
  prices: Record<string, StaplePrice>;
  stores: { id: string; name: string }[];
}

export function StapleDetailPanel({ name, prices, stores }: StapleDetailPanelProps) {
  // Build sorted entries (cheapest first)
  const entries = stores
    .filter((s) => prices[s.id])
    .map((s) => {
      const p = prices[s.id];
      const effective = p.salePrice ?? p.price;
      return { storeId: s.id, storeName: s.name, ...p, effective };
    })
    .sort((a, b) => (a.effective ?? Infinity) - (b.effective ?? Infinity));

  if (entries.length === 0) return null;

  const cheapestPrice = entries[0].effective;
  const mostExpensive = entries[entries.length - 1].effective;
  const range = (mostExpensive ?? 0) - (cheapestPrice ?? 0);

  return (
    <div className="p-4 space-y-4">
      {/* Price range summary */}
      <div className="flex items-baseline gap-2">
        <span className="text-sm text-muted-foreground">{name} &mdash;</span>
        {cheapestPrice != null && mostExpensive != null && range > 0 ? (
          <span className="text-sm">
            <span className="font-semibold text-savings">{formatKYD(cheapestPrice)}</span>
            <span className="text-muted-foreground"> to </span>
            <span className="font-semibold">{formatKYD(mostExpensive)}</span>
            <span className="text-muted-foreground ml-1.5 text-xs">
              (save {formatKYD(range)}, {Math.round((range / mostExpensive) * 100)}%)
            </span>
          </span>
        ) : (
          <span className="text-sm font-semibold">
            {cheapestPrice != null ? formatKYD(cheapestPrice) : "--"}
          </span>
        )}
      </div>

      {/* Store cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {entries.map((entry, i) => {
          const isCheapest = i === 0 && entries.length > 1;
          const isOnSale =
            entry.salePrice != null &&
            entry.price != null &&
            entry.salePrice < entry.price;
          const priceDiff =
            cheapestPrice != null && entry.effective != null
              ? entry.effective - cheapestPrice
              : 0;

          return (
            <div
              key={entry.storeId}
              className={`rounded-xl border p-3 flex flex-col gap-2 ${
                isCheapest
                  ? "ring-2 ring-savings/40 bg-savings/[0.04]"
                  : "bg-card"
              }`}
            >
              {/* Store + badge */}
              <div className="flex items-center justify-between gap-1">
                <StoreBadge storeId={entry.storeId} />
                {isCheapest && (
                  <span className="text-[10px] font-bold text-savings uppercase tracking-wide">
                    Best
                  </span>
                )}
              </div>

              {/* Image */}
              <div className="flex justify-center py-1">
                <ProductImage
                  src={entry.imageUrl}
                  alt={entry.productName}
                  size="lg"
                />
              </div>

              {/* Price */}
              <div className="text-center">
                <div
                  className={`text-lg font-bold tabular-nums ${
                    isCheapest ? "text-savings" : "text-foreground"
                  }`}
                >
                  {entry.effective != null ? formatKYD(entry.effective) : "--"}
                </div>
                {isOnSale && (
                  <div className="text-xs text-muted-foreground line-through tabular-nums">
                    {formatKYD(entry.price!)}
                  </div>
                )}
                {!isCheapest && priceDiff > 0.01 && (
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    +{formatKYD(priceDiff)} more
                  </div>
                )}
              </div>

              {/* Product name + size */}
              <div className="text-center space-y-0.5 mt-auto">
                <div className="text-xs font-medium leading-tight line-clamp-2">
                  {entry.productName}
                </div>
                {entry.size && (
                  <div className="text-[11px] text-muted-foreground">
                    {entry.size}
                  </div>
                )}
              </div>

              {/* Price bar — full = cheapest (good), short = expensive */}
              {mostExpensive != null &&
                cheapestPrice != null &&
                mostExpensive > cheapestPrice && (
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isCheapest ? "bg-savings" : "bg-muted-foreground/30"
                      }`}
                      style={{
                        width: `${
                          entry.effective != null
                            ? 100 -
                              ((entry.effective - cheapestPrice) /
                                (mostExpensive - cheapestPrice)) *
                                100
                            : 0
                        }%`,
                        minWidth: "8px",
                      }}
                    />
                  </div>
                )}
            </div>
          );
        })}

        {/* Empty store slots */}
        {stores
          .filter((s) => !prices[s.id])
          .map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-dashed p-3 flex flex-col items-center justify-center gap-2 text-muted-foreground/40 min-h-[140px]"
            >
              <StoreBadge storeId={s.id} />
              <span className="text-xs">Not available</span>
            </div>
          ))}
      </div>
    </div>
  );
}
