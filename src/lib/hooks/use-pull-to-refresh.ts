"use client";

import { useRef, useEffect, useCallback } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: UsePullToRefreshOptions) {
  const startY = useRef(0);
  const pulling = useRef(false);
  const refreshing = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current || refreshing.current) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta < 0) {
      pulling.current = false;
    }
  }, []);

  const handleTouchEnd = useCallback(async (e: TouchEvent) => {
    if (!pulling.current || refreshing.current) return;
    const delta = e.changedTouches[0].clientY - startY.current;
    pulling.current = false;

    if (delta > threshold) {
      refreshing.current = true;
      try {
        await onRefresh();
      } finally {
        refreshing.current = false;
      }
    }
  }, [onRefresh, threshold]);

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
}
