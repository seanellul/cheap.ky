const STORAGE_KEYS = {
  searches: "cheapky_search_history",
  carts: "cheapky_cart_history",
} as const;

export interface SearchHistoryEntry {
  query: string;
  resultCount: number;
  timestamp: string;
}

export interface CartSnapshotItem {
  name: string;
  quantity: number;
  productId?: number;
  prices: Record<string, number | null>;
}

export interface CartSnapshotEntry {
  id: string;
  timestamp: string;
  items: CartSnapshotItem[];
  totalBestPrice: number;
}

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Safari private browsing or quota exceeded
  }
}

// ── Search History ──

export function getSearchHistory(): SearchHistoryEntry[] {
  const raw = safeGetItem(STORAGE_KEYS.searches);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addSearchEntry(query: string, resultCount: number): void {
  const history = getSearchHistory();
  // Dedupe by query — remove existing entry with same query
  const filtered = history.filter(
    (e) => e.query.toLowerCase() !== query.toLowerCase()
  );
  filtered.unshift({ query, resultCount, timestamp: new Date().toISOString() });
  // Cap at 20
  safeSetItem(STORAGE_KEYS.searches, JSON.stringify(filtered.slice(0, 20)));
}

export function removeSearchEntry(query: string): void {
  const history = getSearchHistory();
  const filtered = history.filter(
    (e) => e.query.toLowerCase() !== query.toLowerCase()
  );
  safeSetItem(STORAGE_KEYS.searches, JSON.stringify(filtered));
}

export function clearSearchHistory(): void {
  safeSetItem(STORAGE_KEYS.searches, "[]");
}

// ── Cart Snapshots ──

export function getCartSnapshots(): CartSnapshotEntry[] {
  const raw = safeGetItem(STORAGE_KEYS.carts);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addCartSnapshot(snapshot: Omit<CartSnapshotEntry, "id" | "timestamp">): void {
  const snapshots = getCartSnapshots();
  snapshots.unshift({
    ...snapshot,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  });
  // Cap at 10
  safeSetItem(STORAGE_KEYS.carts, JSON.stringify(snapshots.slice(0, 10)));
}

export function removeCartSnapshot(id: string): void {
  const snapshots = getCartSnapshots();
  safeSetItem(
    STORAGE_KEYS.carts,
    JSON.stringify(snapshots.filter((s) => s.id !== id))
  );
}

export function clearCartHistory(): void {
  safeSetItem(STORAGE_KEYS.carts, "[]");
}
