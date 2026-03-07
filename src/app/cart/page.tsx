"use client";

import { useState, useEffect, useCallback } from "react";
import { ShoppingCart, Trash2, Minus, Plus, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CartSummary } from "@/components/cart-summary";
import { ShoppingList } from "@/components/shopping-list";
import { EmptyState } from "@/components/empty-state";
import { StoreBadge } from "@/components/store-badge";
import { formatKYD } from "@/lib/utils/currency";
import { useCart } from "@/lib/contexts/cart-context";
import { STORE_IDS } from "@/components/price-comparison-row";
import { addCartSnapshot } from "@/lib/history";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

interface CartItem {
  cartItemId: number;
  productId?: number;
  name: string;
  quantity: number;
  prices: Record<string, { price: number | null; productName: string }>;
  source: "smart" | "search";
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearOpen, setClearOpen] = useState(false);
  const { refreshCart } = useCart();

  const fetchCart = useCallback(async () => {
    const [smartRes, cartRes] = await Promise.all([
      fetch("/api/smart-cart"),
      fetch("/api/cart"),
    ]);
    const [smartData, cartData] = await Promise.all([smartRes.json(), cartRes.json()]);

    const smartItems: CartItem[] = (smartData.items || []).map((i: { cartItemId: number; name: string; quantity: number; prices: Record<string, { price: number | null; productName: string }> }) => ({
      cartItemId: i.cartItemId,
      name: i.name,
      quantity: i.quantity,
      prices: i.prices,
      source: "smart" as const,
    }));

    const searchItems: CartItem[] = (cartData.items || []).map((i: { cartItemId: number; productId: number; name: string; quantity: number; prices: Record<string, number | null> }) => ({
      cartItemId: i.cartItemId,
      productId: i.productId,
      name: i.name,
      quantity: i.quantity,
      prices: Object.fromEntries(
        Object.entries(i.prices).map(([storeId, price]) => [
          storeId,
          { price: price as number | null, productName: "" },
        ])
      ),
      source: "search" as const,
    }));

    setItems([...smartItems, ...searchItems]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  async function updateQuantity(item: CartItem, quantity: number) {
    const endpoint = item.source === "smart" ? "/api/smart-cart" : "/api/cart";
    await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartItemId: item.cartItemId, quantity }),
    });
    fetchCart();
    refreshCart();
  }

  async function removeItem(item: CartItem) {
    const endpoint = item.source === "smart" ? "/api/smart-cart" : "/api/cart";
    await fetch(endpoint, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartItemId: item.cartItemId }),
    });
    fetchCart();
    refreshCart();
  }

  async function clearCart() {
    await Promise.all(
      items.map((item) => {
        const endpoint = item.source === "smart" ? "/api/smart-cart" : "/api/cart";
        return fetch(endpoint, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartItemId: item.cartItemId }),
        });
      })
    );
    setClearOpen(false);
    fetchCart();
    refreshCart();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold sm:text-2xl">My Cart</h1>
        <div className="space-y-2 stagger-children">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 skeleton-shimmer rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Build prices in the format CartSummary expects
  const activeStoreIds = STORE_IDS.filter((id) => id !== "kirkmarket");

  const summaryItems = items.map((item) => {
    const prices: Record<string, number | null> = {};
    for (const storeId of activeStoreIds) {
      prices[storeId] = item.prices[storeId]?.price ?? null;
    }
    return { productId: item.cartItemId, quantity: item.quantity, prices };
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">My Cart</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            We find the cheapest store for each item
          </p>
        </div>
        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const snapshotItems = items.map((item) => ({
                  name: item.name,
                  quantity: item.quantity,
                  productId: item.productId,
                  prices: Object.fromEntries(
                    activeStoreIds.map((sid) => [sid, item.prices[sid]?.price ?? null])
                  ),
                }));
                let totalBestPrice = 0;
                for (const item of items) {
                  let best = Infinity;
                  for (const sid of activeStoreIds) {
                    const p = item.prices[sid]?.price;
                    if (p != null && p < best) best = p;
                  }
                  if (best < Infinity) totalBestPrice += best * item.quantity;
                }
                addCartSnapshot({ items: snapshotItems, totalBestPrice });
                toast.success("Cart saved to history", {
                  action: { label: "View History", onClick: () => window.location.href = "/history" },
                });
              }}
            >
              <Clock className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
          <Dialog open={clearOpen} onOpenChange={setClearOpen}>
            <DialogTrigger render={
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Clear cart?</DialogTitle>
                <DialogDescription>
                  This will remove all {items.length} item{items.length > 1 ? "s" : ""} from your cart.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button variant="destructive" onClick={clearCart}>Clear Cart</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Add items from Staples or Search to start saving"
          actionLabel="Browse Staples"
          actionHref="/staples"
        />
      ) : (
        <>
          {/* Mobile: card-based items */}
          <div className="sm:hidden space-y-2 stagger-children">
            {items.map((item) => {
              let bestPrice = Infinity;
              let bestStore = "";
              for (const storeId of activeStoreIds) {
                const p = item.prices[storeId]?.price;
                if (p != null && p < bestPrice) {
                  bestPrice = p;
                  bestStore = storeId;
                }
              }

              return (
                <div
                  key={item.cartItemId}
                  className="rounded-2xl border bg-card p-3 space-y-2.5"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm leading-snug line-clamp-2">{item.name}</div>
                      {bestStore && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {item.prices[bestStore]?.productName}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeItem(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5 bg-muted/60 rounded-xl p-0.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => updateQuantity(item, item.quantity - 1)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="text-sm font-semibold w-7 text-center tabular-nums">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => updateQuantity(item, item.quantity + 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Best price */}
                    {bestPrice < Infinity ? (
                      <div className="flex items-center gap-2">
                        <StoreBadge storeId={bestStore} size="sm" />
                        <span className="text-base font-bold text-savings tabular-nums">
                          {formatKYD(bestPrice * item.quantity)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">--</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="py-2.5 px-3 text-left text-sm font-medium">Item</th>
                  <th className="py-2.5 px-2 text-center text-sm font-medium w-28">Qty</th>
                  {activeStoreIds.map((id) => (
                    <th key={id} className="py-2.5 px-2 text-center text-sm font-medium hidden md:table-cell">
                      <StoreBadge storeId={id} />
                    </th>
                  ))}
                  <th className="py-2.5 px-2 text-center text-sm font-medium">Best</th>
                  <th className="py-2.5 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  let bestPrice = Infinity;
                  let bestStore = "";
                  for (const storeId of activeStoreIds) {
                    const p = item.prices[storeId]?.price;
                    if (p != null && p < bestPrice) {
                      bestPrice = p;
                      bestStore = storeId;
                    }
                  }

                  return (
                    <tr key={item.cartItemId} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-medium text-sm">{item.name}</div>
                        {bestStore && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {item.prices[bestStore]?.productName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="outline"
                            size="icon-sm"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-6 text-center tabular-nums">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      {activeStoreIds.map((storeId) => {
                        const storeData = item.prices[storeId];
                        const price = storeData?.price;
                        const isBest = storeId === bestStore;
                        return (
                          <td
                            key={storeId}
                            className="py-3 px-2 text-center text-sm tabular-nums hidden md:table-cell"
                          >
                            {price != null ? (
                              <div>
                                <span className={isBest ? "font-bold text-savings" : ""}>
                                  {formatKYD(price * item.quantity)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">--</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3 px-2 text-center">
                        {bestPrice < Infinity ? (
                          <div>
                            <div className="text-sm font-bold text-savings tabular-nums">
                              {formatKYD(bestPrice * item.quantity)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              <StoreBadge storeId={bestStore} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeItem(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <CartSummary items={summaryItems} storeIds={activeStoreIds} />

          <ShoppingList
            items={items.map((i) => ({
              productId: i.cartItemId,
              name: i.name,
              quantity: i.quantity,
              prices: Object.fromEntries(
                activeStoreIds.map((sid) => [sid, i.prices[sid]?.price ?? null])
              ),
            }))}
            storeIds={activeStoreIds}
          />
        </>
      )}
    </div>
  );
}
