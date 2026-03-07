"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface CartContextValue {
  cartCount: number;
  refreshCart: () => void;
}

const CartContext = createContext<CartContextValue>({ cartCount: 0, refreshCart: () => {} });

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartCount, setCartCount] = useState(0);

  const refreshCart = useCallback(async () => {
    try {
      const [smartRes, cartRes] = await Promise.all([
        fetch("/api/smart-cart"),
        fetch("/api/cart"),
      ]);
      const [smartData, cartData] = await Promise.all([smartRes.json(), cartRes.json()]);
      setCartCount((smartData.items?.length ?? 0) + (cartData.items?.length ?? 0));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  return (
    <CartContext value={{ cartCount, refreshCart }}>
      {children}
    </CartContext>
  );
}

export function useCart() {
  return useContext(CartContext);
}
