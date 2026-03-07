import posthog from "posthog-js";

function capture(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  posthog.capture(event, properties);
}

// Search
export function trackSearch(query: string, resultCount: number) {
  capture("search", { query, result_count: resultCount });
}

// Product views
export function trackProductView(productId: number, productName: string, storeId?: string) {
  capture("product_viewed", { product_id: productId, product_name: productName, store_id: storeId });
}

// Cart
export function trackAddToCart(productName: string, storeId: string, price: number) {
  capture("add_to_cart", { product_name: productName, store_id: storeId, price });
}

export function trackRemoveFromCart(productName: string, storeId: string) {
  capture("remove_from_cart", { product_name: productName, store_id: storeId });
}

// Staples
export function trackStapleExpand(stapleName: string) {
  capture("staple_expanded", { staple_name: stapleName });
}

export function trackStapleAddToCart(stapleName: string) {
  capture("staple_add_to_cart", { staple_name: stapleName });
}

// Compare
export function trackCompare(productName: string, storeCount: number) {
  capture("compare_viewed", { product_name: productName, store_count: storeCount });
}

// Report
export function trackReportView() {
  capture("report_viewed");
}

// App banner
export function trackAppBannerClick(platform: string) {
  capture("app_banner_clicked", { platform });
}

export function trackAppBannerDismiss() {
  capture("app_banner_dismissed");
}

export function trackAppRequest(platform: "ios" | "android") {
  capture("app_request", { platform });
}
