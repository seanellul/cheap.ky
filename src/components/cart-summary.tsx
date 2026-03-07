"use client";

import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StoreBadge } from "@/components/store-badge";
import { formatKYD } from "@/lib/utils/currency";
import {
  calculateBestSingleStore,
  calculateOptimalSplit,
} from "@/lib/utils/pricing";
import { STORE_NAMES } from "./price-comparison-row";
import { useInView } from "@/lib/hooks/use-in-view";
import { cn } from "@/lib/utils";

interface CartItem {
  productId: number;
  quantity: number;
  prices: Record<string, number | null>;
}

interface CartSummaryProps {
  items: CartItem[];
  storeIds: string[];
}

export function CartSummary({ items, storeIds }: CartSummaryProps) {
  const [ref, isInView] = useInView();

  if (items.length === 0) return null;

  const cartProducts = items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    prices: item.prices,
  }));

  const singleStoreResults = calculateBestSingleStore(cartProducts, storeIds);
  const optimalSplit = calculateOptimalSplit(cartProducts, storeIds);

  const bestSingle = singleStoreResults[0];
  const savings = bestSingle ? bestSingle.total - optimalSplit.total : 0;

  // Calculate max for proportional bar
  const maxTotal = Math.max(...singleStoreResults.map((s) => s.total), 1);

  return (
    <div
      ref={ref}
      className={cn(
        "grid gap-4 md:grid-cols-2 transition-all duration-500",
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Best Single Store</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {singleStoreResults.slice(0, 4).map((store, i) => (
            <div key={store.storeId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {i === 0 && <Trophy className="h-3.5 w-3.5 text-savings" />}
                  <StoreBadge storeId={store.storeId} />
                  {store.missingCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({store.missingCount} missing)
                    </span>
                  )}
                </div>
                <span className={cn("tabular-nums", store === bestSingle && "font-bold text-savings")}>
                  {formatKYD(store.total)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    i === 0 ? "bg-savings" : "bg-muted-foreground/30"
                  )}
                  style={{ width: `${(store.total / maxTotal) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="ring-1 ring-savings/20 bg-savings/[0.02]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Optimal Split
            {savings > 0 && (
              <span className="inline-flex items-center rounded-full bg-savings/15 px-2 py-0.5 text-xs font-medium text-savings">
                Save {formatKYD(savings)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-savings tabular-nums mb-4">
            {formatKYD(optimalSplit.total)}
          </div>
          <div className="space-y-2">
            {Object.entries(optimalSplit.storeBreakdown)
              .filter(([, v]) => v.itemCount > 0)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([storeId, breakdown]) => (
                <div key={storeId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <StoreBadge storeId={storeId} />
                    <span className="text-muted-foreground text-xs">
                      {breakdown.itemCount} item{breakdown.itemCount > 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="tabular-nums">{formatKYD(breakdown.total)}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
