"use client";

import { useState, useEffect } from "react";
import { Loader2, ShoppingCart, Check, TrendingDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StoreBadge } from "@/components/store-badge";
import { PriceDisplay } from "@/components/price-display";
import { ProductImage } from "@/components/product-image";
import { formatKYD } from "@/lib/utils/currency";
import { track } from "@/lib/utils/track";
import { trackProductView } from "@/lib/analytics";

interface StoreMatch {
  storeProductId: number;
  storeId: string;
  storeName: string;
  name: string;
  brand: string | null;
  size: string | null;
  price: number | null;
  salePrice: number | null;
  imageUrl: string | null;
  upc: string | null;
  categoryRaw: string | null;
  sourceUrl: string | null;
  matchMethod: string;
  confidence: number;
}

interface ProductData {
  product: {
    id: number;
    name: string;
    brand: string | null;
    size: string | null;
    upc: string | null;
    imageUrl: string | null;
  };
  storeMatches: StoreMatch[];
}

interface ProductDetailDialogProps {
  productId: number | null;
  onClose: () => void;
  onAddToCart?: (productId: number) => void;
}

export function ProductDetailDialog({ productId, onClose, onAddToCart }: ProductDetailDialogProps) {
  const [data, setData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!productId || productId < 0) return;
    setLoading(true);
    setData(null);
    fetch(`/api/product/${productId}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        track("product_view", d?.product?.name ?? null, { productId });
        trackProductView(productId, d?.product?.name ?? "");
      })
      .finally(() => setLoading(false));
  }, [productId]);

  function handleAdd() {
    if (!productId || !onAddToCart) return;
    onAddToCart(productId);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  // Find cheapest
  let cheapestStore: string | null = null;
  let cheapestPrice = Infinity;
  if (data) {
    for (const m of data.storeMatches) {
      const p = m.salePrice ?? m.price;
      if (p != null && p < cheapestPrice) {
        cheapestPrice = p;
        cheapestStore = m.storeId;
      }
    }
  }

  return (
    <Dialog open={productId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading prices...</span>
          </div>
        )}
        {data && (
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-start gap-3">
                <ProductImage src={data.product.imageUrl} alt={data.product.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-base leading-tight">{data.product.name}</DialogTitle>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {data.product.brand && <Badge variant="secondary">{data.product.brand}</Badge>}
                    {data.product.size && <Badge variant="outline">{data.product.size}</Badge>}
                    {data.product.upc && (
                      <Badge variant="outline" className="font-mono text-[10px]">UPC: {data.product.upc}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>

            {/* Price comparison */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Store Prices</h3>
              <div className="stagger-children space-y-1.5">
                {data.storeMatches.map((m) => {
                  const isCheapest = m.storeId === cheapestStore;
                  return (
                    <div
                      key={m.storeId}
                      className={`flex items-center gap-3 rounded-xl p-3 transition-all duration-200 ${
                        isCheapest
                          ? "bg-savings/8 ring-1 ring-savings/25"
                          : "bg-muted/40"
                      }`}
                    >
                      <ProductImage src={m.imageUrl} alt={m.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <StoreBadge storeId={m.storeId} />
                          {isCheapest && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-savings">
                              <TrendingDown className="h-2.5 w-2.5" />
                              BEST
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{m.name}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <PriceDisplay price={m.price} salePrice={m.salePrice} isCheapest={isCheapest} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Savings callout */}
            {data.storeMatches.length >= 2 && cheapestPrice < Infinity && (
              (() => {
                const prices = data.storeMatches
                  .map((m) => m.salePrice ?? m.price)
                  .filter((p): p is number => p != null);
                const max = Math.max(...prices);
                const savings = max - cheapestPrice;
                if (savings <= 0) return null;
                return (
                  <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-savings/8 text-sm">
                    <TrendingDown className="h-4 w-4 text-savings" />
                    <span className="text-muted-foreground">
                      Save up to <span className="font-bold text-savings">{formatKYD(savings)}</span> at{" "}
                      <StoreBadge storeId={cheapestStore!} size="sm" />
                    </span>
                  </div>
                );
              })()
            )}

            {/* Add to cart */}
            {onAddToCart && productId && productId > 0 && (
              <Button
                onClick={handleAdd}
                className="w-full h-11 text-sm font-semibold rounded-xl"
                disabled={added}
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5 animate-check-pop" />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-1.5" />
                    Add to Cart
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
