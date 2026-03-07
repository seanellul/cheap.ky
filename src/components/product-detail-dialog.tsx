"use client";

import { useState, useEffect } from "react";
import { Loader2, ExternalLink, ShoppingCart, Check } from "lucide-react";
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
      .then(setData)
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
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {data && (
          <>
            <DialogHeader>
              <div className="flex items-start gap-3">
                <ProductImage src={data.product.imageUrl} alt={data.product.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-base leading-tight">{data.product.name}</DialogTitle>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
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
            <div className="space-y-2 mt-2">
              <h3 className="text-sm font-medium text-muted-foreground">Store Prices</h3>
              {data.storeMatches.map((m) => {
                const isCheapest = m.storeId === cheapestStore;
                return (
                  <div
                    key={m.storeId}
                    className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${
                      isCheapest ? "bg-savings/10 ring-1 ring-savings/30" : "bg-muted/50"
                    }`}
                  >
                    <ProductImage src={m.imageUrl} alt={m.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <StoreBadge storeId={m.storeId} />
                        {isCheapest && (
                          <span className="text-[10px] font-medium text-savings">BEST PRICE</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">{m.name}</div>
                      {m.size && (
                        <div className="text-[10px] text-muted-foreground/70">{m.size}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <PriceDisplay price={m.price} salePrice={m.salePrice} isCheapest={isCheapest} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Savings callout */}
            {data.storeMatches.length >= 2 && cheapestPrice < Infinity && (
              <div className="text-center text-sm text-muted-foreground">
                {(() => {
                  const prices = data.storeMatches
                    .map((m) => m.salePrice ?? m.price)
                    .filter((p): p is number => p != null);
                  const max = Math.max(...prices);
                  const savings = max - cheapestPrice;
                  if (savings <= 0) return null;
                  return (
                    <span>
                      Save up to <span className="font-bold text-savings">{formatKYD(savings)}</span> by shopping at{" "}
                      <StoreBadge storeId={cheapestStore!} size="sm" />
                    </span>
                  );
                })()}
              </div>
            )}

            {/* Add to cart */}
            {onAddToCart && productId && productId > 0 && (
              <Button onClick={handleAdd} className="w-full" disabled={added}>
                {added ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
