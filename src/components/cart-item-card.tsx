"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoreBadge } from "@/components/store-badge";
import { formatKYD } from "@/lib/utils/currency";

const STORE_IDS = ["fosters", "hurleys", "kirkmarket", "costuless", "pricedright"] as const;

interface CartItemCardProps {
  cartItemId: number;
  name: string;
  brand: string | null;
  size: string | null;
  quantity: number;
  prices: Record<string, number | null>;
  onUpdateQuantity: (cartItemId: number, quantity: number) => void;
  onRemove: (cartItemId: number) => void;
}

export function CartItemCard({
  cartItemId,
  name,
  brand,
  size,
  quantity,
  prices,
  onUpdateQuantity,
  onRemove,
}: CartItemCardProps) {
  let bestPrice = Infinity;
  let bestStore = "";
  for (const storeId of STORE_IDS) {
    const p = prices[storeId];
    if (p != null && p < bestPrice) {
      bestPrice = p;
      bestStore = storeId;
    }
  }

  return (
    <div className="rounded-xl border bg-card p-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm leading-tight line-clamp-2">{name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {[brand, size].filter(Boolean).join(" - ")}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={() => onRemove(cartItemId)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            className="h-9 w-9"
            onClick={() => onUpdateQuantity(cartItemId, quantity - 1)}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="text-sm font-medium w-6 text-center tabular-nums">{quantity}</span>
          <Button
            variant="outline"
            size="icon-sm"
            className="h-9 w-9"
            onClick={() => onUpdateQuantity(cartItemId, quantity + 1)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        {bestPrice < Infinity && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Best price</div>
            <div className="text-sm font-bold text-savings tabular-nums">{formatKYD(bestPrice * quantity)}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5 mt-3">
        {STORE_IDS.map((storeId) => {
          const price = prices[storeId];
          if (price == null) return null;
          const isBest = storeId === bestStore;
          return (
            <div
              key={storeId}
              className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs ${
                isBest ? "bg-savings/10 ring-1 ring-savings/30" : "bg-muted"
              }`}
            >
              <StoreBadge storeId={storeId} size="sm" />
              <span className={`tabular-nums ${isBest ? "font-bold text-savings" : ""}`}>
                {formatKYD(price * quantity)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
