export function track(
  type: "search" | "product_view" | "compare_view" | "page_view",
  data?: string | null,
  extra?: { productId?: number; resultCount?: number }
) {
  // Fire and forget — don't block UI
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, data, ...extra }),
  }).catch(() => {
    // silently fail — analytics should never break the app
  });
}
