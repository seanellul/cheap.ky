"use client";

import { useRef, useCallback, type RefObject } from "react";

interface UseSwipeToDismissOptions {
  onDismiss: () => void;
  threshold?: number;
}

export function useSwipeToDismiss(
  ref: RefObject<HTMLElement | null>,
  { onDismiss, threshold = 100 }: UseSwipeToDismissOptions
) {
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
    isDragging.current = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !ref.current) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta < 0) return; // only allow downward drag
    currentY.current = delta;
    ref.current.style.transform = `translateY(${delta}px)`;
    ref.current.style.transition = "none";
  }, [ref]);

  const onTouchEnd = useCallback(() => {
    if (!isDragging.current || !ref.current) return;
    isDragging.current = false;

    if (currentY.current > threshold) {
      ref.current.style.transition = "transform 0.2s ease-out";
      ref.current.style.transform = "translateY(100%)";
      setTimeout(onDismiss, 200);
    } else {
      ref.current.style.transition = "transform 0.2s ease-out";
      ref.current.style.transform = "translateY(0)";
    }
  }, [ref, threshold, onDismiss]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
