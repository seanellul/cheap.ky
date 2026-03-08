"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StoreBadge } from "@/components/store-badge";
import { ProductImage } from "@/components/product-image";
import { PriceDisplay } from "@/components/price-display";
import { StalenessBadge } from "@/components/staleness-badge";

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
  updatedAt: string | null;
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

interface CompareDetailDialogProps {
  productId: number | null;
  onClose: () => void;
}

export function CompareDetailDialog({ productId, onClose }: CompareDetailDialogProps) {
  const [data, setData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId || productId < 0) return;
    setLoading(true);
    setData(null);
    fetch(`/api/product/${productId}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [productId]);

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

  // Check if all UPCs match
  const allUpcs = data?.storeMatches.map((m) => m.upc).filter(Boolean) ?? [];
  const upcsMatch = allUpcs.length >= 2 && new Set(allUpcs).size === 1;

  return (
    <Dialog open={productId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {data && (
          <>
            <DialogHeader>
              <DialogTitle className="text-base">{data.product.name}</DialogTitle>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {data.product.upc && (
                  <Badge variant="outline" className="font-mono text-[10px]">UPC: {data.product.upc}</Badge>
                )}
                {upcsMatch ? (
                  <Badge variant="secondary" className="text-savings text-[10px] gap-1">
                    <CheckCircle2 className="h-3 w-3" /> UPC Verified Match
                  </Badge>
                ) : allUpcs.length >= 2 ? (
                  <Badge variant="secondary" className="text-amber-600 dark:text-amber-400 text-[10px] gap-1">
                    <AlertTriangle className="h-3 w-3" /> UPC Mismatch
                  </Badge>
                ) : null}
              </div>
            </DialogHeader>

            {/* Side-by-side comparison columns */}
            <div className={`grid gap-3 mt-2 ${
              data.storeMatches.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3"
            }`}>
              {data.storeMatches.map((m) => {
                const isCheapest = m.storeId === cheapestStore;
                return (
                  <div
                    key={m.storeId}
                    className={`rounded-xl border p-3 space-y-3 ${
                      isCheapest ? "ring-2 ring-savings/40 bg-savings/[0.03]" : "bg-card"
                    }`}
                  >
                    {/* Store header */}
                    <div className="flex items-center justify-between">
                      <StoreBadge storeId={m.storeId} />
                      {isCheapest && (
                        <span className="text-[10px] font-bold text-savings uppercase tracking-wide">Best</span>
                      )}
                    </div>

                    {/* Product image */}
                    <div className="flex justify-center">
                      <ProductImage src={m.imageUrl} alt={m.name} size="lg" />
                    </div>

                    {/* Price */}
                    <div className="text-center space-y-1">
                      <PriceDisplay price={m.price} salePrice={m.salePrice} isCheapest={isCheapest} className="text-lg" />
                      <StalenessBadge updatedAt={m.updatedAt} />
                    </div>

                    {/* Product details */}
                    <div className="space-y-1.5 text-xs">
                      <DetailRow label="Name" value={m.name} />
                      <DetailRow label="Brand" value={m.brand} />
                      <DetailRow label="Size" value={m.size} />
                      <DetailRow label="UPC" value={m.upc} mono />
                      <DetailRow label="Category" value={m.categoryRaw ? simplifyCategory(m.categoryRaw) : null} />
                      <div className="pt-1 border-t">
                        <span className="text-muted-foreground/70">Match: </span>
                        <span className="text-muted-foreground">{m.matchMethod}</span>
                        {m.confidence < 1 && (
                          <span className="text-muted-foreground/70"> ({Math.round(m.confidence * 100)}%)</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-muted-foreground/70">{label}: </span>
      <span className={`text-foreground ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function simplifyCategory(raw: string): string {
  const parts = raw.split(" / ");
  return parts.length > 2 ? parts.slice(2).join(" / ") : parts[parts.length - 1];
}
