"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/contexts/cart-context";

export function HeaderCartBadge() {
  const { cartCount } = useCart();

  return (
    <a href="/cart" className="relative text-muted-foreground hover:text-primary transition-colors">
      <ShoppingCart className="h-5 w-5" />
      {cartCount > 0 && (
        <span
          key={cartCount}
          className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground px-1 animate-in zoom-in-50 duration-200"
        >
          {cartCount}
        </span>
      )}
    </a>
  );
}
