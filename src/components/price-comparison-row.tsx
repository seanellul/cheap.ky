"use client";

import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
import { StoreBadge } from "@/components/store-badge";
import { PriceDisplay } from "@/components/price-display";
import { SaleBadge } from "@/components/sale-badge";
import { formatKYD } from "@/lib/utils/currency";

const STORE_IDS = ["fosters", "hurleys", "kirkmarket", "costuless", "pricedright", "shopright"] as const;
const STORE_NAMES: Record<string, string> = {
  fosters: "Foster's",
  hurleys: "Hurley's",
  kirkmarket: "Kirk Mkt",
  costuless: "Cost-U-Less",
  pricedright: "Priced Right",
  shopright: "Shopright",
};

interface PriceComparisonRowProps {
  id: number;
  name: string;
  brand: string | null;
  size: string | null;
  imageUrl: string | null;
  prices: Record<string, { price: number | null; salePrice: number | null; isPromo?: boolean }>;
  minPrice?: number | null;
  onAddToCart?: (productId: number) => void;
  onClickProduct?: (productId: number) => void;
  showAddToCart?: boolean;
}

export function PriceComparisonRow({
  id,
  name,
  brand,
  size,
  imageUrl,
  prices,
  onAddToCart,
  onClickProduct,
  showAddToCart = true,
}: PriceComparisonRowProps) {
  const [added, setAdded] = useState(false);

  let cheapestStore: string | null = null;
  let cheapestPrice = Infinity;

  for (const storeId of STORE_IDS) {
    const p = prices[storeId];
    if (!p) continue;
    const effectivePrice = p.salePrice ?? p.price;
    if (effectivePrice != null && effectivePrice < cheapestPrice) {
      cheapestPrice = effectivePrice;
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
    <tr className="border-b hover:bg-muted/50 transition-colors">
      <td className="py-3 px-3">
        <div
          className={`flex items-center gap-3 ${id > 0 && onClickProduct ? "cursor-pointer" : ""}`}
          onClick={() => id > 0 && onClickProduct?.(id)}
        >
          <ProductImage src={imageUrl} alt={name} size="md" />
          <div>
            <div className="font-medium text-sm">{name}</div>
            <div className="text-xs text-muted-foreground">
              {[brand, size].filter(Boolean).join(" - ")}
            </div>
          </div>
        </div>
      </td>
      {STORE_IDS.map((storeId) => {
        const p = prices[storeId];
        const isCheapest = storeId === cheapestStore;
        return (
          <td key={storeId} className="py-3 px-2 text-center text-sm">
            <PriceDisplay price={p?.price} salePrice={p?.salePrice} isCheapest={isCheapest} />
            {p?.isPromo && <SaleBadge className="mt-0.5" />}
          </td>
        );
      })}
      {showAddToCart && (
        <td className="py-3 px-2 text-center">
          {id > 0 && onAddToCart && (
            <Button
              size="sm"
              variant={added ? "secondary" : "outline"}
              onClick={handleAdd}
              className="transition-all duration-200"
            >
              {added ? (
                <Check className="h-3.5 w-3.5 text-savings" />
              ) : (
                <>
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span className="ml-1">Add</span>
                </>
              )}
            </Button>
          )}
        </td>
      )}
    </tr>
  );
}

export function PriceComparisonHeader({ showAddToCart = true }: { showAddToCart?: boolean }) {
  return (
    <thead>
      <tr className="border-b bg-muted/40">
        <th className="py-2.5 px-3 text-left text-sm font-medium">Product</th>
        {STORE_IDS.map((id) => (
          <th key={id} className="py-2.5 px-2 text-center text-sm font-medium">
            <StoreBadge storeId={id} />
          </th>
        ))}
        {showAddToCart && (
          <th className="py-2.5 px-2 text-center text-sm font-medium w-20"></th>
        )}
      </tr>
    </thead>
  );
}

export { STORE_IDS, STORE_NAMES };
