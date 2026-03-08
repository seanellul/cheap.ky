"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "cheapky-favourites";

interface FavouritesContextValue {
  toggleFavourite: (id: number) => void;
  isFavourited: (id: number) => boolean;
  favouriteIds: number[];
  count: number;
}

const FavouritesContext = createContext<FavouritesContextValue>({
  toggleFavourite: () => {},
  isFavourited: () => false,
  favouriteIds: [],
  count: 0,
});

export function FavouritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<Set<number>>(new Set());

  // Read from localStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as number[];
        if (Array.isArray(parsed)) {
          setIds(new Set(parsed));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
      // ignore
    }
  }, [ids]);

  const toggleFavourite = useCallback((id: number) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast("Removed from favourites");
      } else {
        next.add(id);
        toast("Added to favourites");
      }
      return next;
    });
  }, []);

  const isFavourited = useCallback((id: number) => ids.has(id), [ids]);

  const favouriteIds = [...ids];

  return (
    <FavouritesContext value={{ toggleFavourite, isFavourited, favouriteIds, count: ids.size }}>
      {children}
    </FavouritesContext>
  );
}

export function useFavourites() {
  return useContext(FavouritesContext);
}
