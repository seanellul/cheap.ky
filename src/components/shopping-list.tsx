"use client";

import { useState } from "react";
import { Check, MapPin, CircleCheck, Circle, ChevronDown } from "lucide-react";
import { StoreBadge } from "@/components/store-badge";
import { formatKYD } from "@/lib/utils/currency";
import { calculateOptimalSplit } from "@/lib/utils/pricing";
import { cn } from "@/lib/utils";

interface CartItem {
  productId: number;
  name: string;
  quantity: number;
  prices: Record<string, number | null>;
}

interface ShoppingListProps {
  items: CartItem[];
  storeIds: string[];
}

interface StoreGroup {
  storeId: string;
  items: Array<{
    productId: number;
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
}

export function ShoppingList({ items, storeIds }: ShoppingListProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  if (items.length === 0) return null;

  const cartProducts = items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    prices: item.prices,
  }));

  const optimalSplit = calculateOptimalSplit(cartProducts, storeIds);

  // Group by store
  const storeGroups: StoreGroup[] = [];
  const groupMap = new Map<string, StoreGroup>();

  for (const splitItem of optimalSplit.items) {
    const cartItem = items.find((i) => i.productId === splitItem.productId);
    if (!cartItem) continue;

    if (!groupMap.has(splitItem.storeId)) {
      const group: StoreGroup = { storeId: splitItem.storeId, items: [], total: 0 };
      groupMap.set(splitItem.storeId, group);
      storeGroups.push(group);
    }

    const group = groupMap.get(splitItem.storeId)!;
    group.items.push({
      productId: splitItem.productId,
      name: cartItem.name,
      quantity: splitItem.quantity,
      price: splitItem.price,
    });
    group.total += splitItem.price * splitItem.quantity;
  }

  // Sort stores by most items first
  storeGroups.sort((a, b) => b.items.length - a.items.length);

  function toggleItem(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleStore(storeId: string) {
    const group = groupMap.get(storeId);
    if (!group) return;
    const keys = group.items.map((i) => `${storeId}:${i.productId}`);
    const allChecked = keys.every((k) => checked.has(k));
    setChecked((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (allChecked) next.delete(k);
        else next.add(k);
      }
      return next;
    });
  }

  function toggleCollapse(storeId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });
  }

  const totalItems = optimalSplit.items.length;
  const checkedCount = checked.size;
  const allDone = checkedCount === totalItems;
  const progressPct = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MapPin className="h-4.5 w-4.5 text-primary" />
          Shopping List
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums bg-muted px-2 py-0.5 rounded-full">
          {checkedCount}/{totalItems}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            allDone ? "bg-savings" : "bg-primary"
          )}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {allDone && totalItems > 0 && (
        <div className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-savings/10 text-savings text-sm font-semibold animate-scale-bounce">
          <Check className="h-4.5 w-4.5" />
          All done! Shopping complete.
        </div>
      )}

      <div className="stagger-children space-y-2.5">
        {storeGroups.map((group) => {
          const storeKeys = group.items.map((i) => `${group.storeId}:${i.productId}`);
          const storeCheckedCount = storeKeys.filter((k) => checked.has(k)).length;
          const storeDone = storeCheckedCount === group.items.length;
          const isCollapsed = collapsed.has(group.storeId);

          return (
            <div key={group.storeId} className="rounded-2xl border bg-card overflow-hidden">
              {/* Store header */}
              <button
                type="button"
                onClick={() => toggleCollapse(group.storeId)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 transition-colors active:bg-muted/50",
                  storeDone ? "bg-savings/5" : "bg-muted/20"
                )}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleStore(group.storeId); }}
                    className="shrink-0"
                  >
                    {storeDone ? (
                      <CircleCheck className="h-5 w-5 text-savings" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/30" />
                    )}
                  </button>
                  <StoreBadge storeId={group.storeId} />
                  <span className="text-xs text-muted-foreground">
                    {storeCheckedCount}/{group.items.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-semibold tabular-nums",
                    storeDone ? "text-savings" : ""
                  )}>
                    {formatKYD(group.total)}
                  </span>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    isCollapsed && "-rotate-90"
                  )} />
                </div>
              </button>

              {/* Items */}
              {!isCollapsed && (
                <div className="divide-y divide-border/50">
                  {group.items.map((item) => {
                    const key = `${group.storeId}:${item.productId}`;
                    const isChecked = checked.has(key);

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleItem(key)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 min-h-[48px] active:bg-muted/30",
                          isChecked && "bg-savings/[0.02]"
                        )}
                      >
                        <span className="shrink-0 transition-transform duration-200">
                          {isChecked ? (
                            <CircleCheck className="h-5 w-5 text-savings animate-check-pop" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground/25" />
                          )}
                        </span>
                        <div className={cn("flex-1 min-w-0 transition-opacity duration-200", isChecked && "opacity-40")}>
                          <span className={cn("text-sm", isChecked && "line-through")}>
                            {item.name}
                          </span>
                          {item.quantity > 1 && (
                            <span className="text-xs text-muted-foreground ml-1">x{item.quantity}</span>
                          )}
                        </div>
                        <span className={cn(
                          "text-sm tabular-nums shrink-0 transition-opacity duration-200",
                          isChecked ? "text-muted-foreground/40 line-through" : "font-medium"
                        )}>
                          {formatKYD(item.price * item.quantity)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
