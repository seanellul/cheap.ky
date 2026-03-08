"use client";

import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Search, Loader2, ArrowUpDown, ScanBarcode, Filter, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { addSearchEntry } from "@/lib/history";
import { STORE_META } from "@/lib/data/stores";

const BarcodeScanner = lazy(() =>
  import("@/components/barcode-scanner").then((m) => ({ default: m.BarcodeScanner }))
);

interface SearchResult {
  id: number;
  name: string;
  brand: string | null;
  size: string | null;
  imageUrl: string | null;
  minPrice: number | null;
  storeCount: number;
  prices: Record<string, { price: number | null; salePrice: number | null; name: string }>;
}

type SortOption = "relevance" | "price_asc" | "price_desc" | "stores";

interface SearchBarProps {
  onResults: (results: SearchResult[]) => void;
  onLoadingChange?: (loading: boolean) => void;
  onQueryChange?: (query: string) => void;
  onFocusChange?: (focused: boolean) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Most relevant" },
  { value: "price_asc", label: "Lowest price" },
  { value: "price_desc", label: "Highest price" },
  { value: "stores", label: "Most stores" },
];

const STORE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All stores" },
  ...Object.entries(STORE_META).map(([key, meta]) => ({
    value: key,
    label: meta.name,
  })),
];

export function SearchBar({ onResults, onLoadingChange, onQueryChange, onFocusChange }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("relevance");
  const [store, setStore] = useState("");
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [types, setTypes] = useState<string[]>([]);
  const [activeType, setActiveType] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768 && /Mobi|Android/i.test(navigator.userAgent));
  }, []);

  function doSearch(q: string, s: SortOption, type: string | null, storeId: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length < 2) {
      onResults([]);
      setTypes([]);
      setLoading(false);
      onLoadingChange?.(false);
      return;
    }

    setLoading(true);
    onLoadingChange?.(true);

    debounceRef.current = setTimeout(async () => {
      try {
        let url = `/api/search?q=${encodeURIComponent(q)}&sort=${s}`;
        if (type) url += `&type=${encodeURIComponent(type)}`;
        if (storeId) url += `&store=${encodeURIComponent(storeId)}`;
        const res = await fetch(url);
        const data = await res.json();
        const results = data.results || [];
        onResults(results);
        if (data.types) setTypes(data.types);
        if (results.length > 0) {
          addSearchEntry(q, results.length);
        }
      } catch {
        onResults([]);
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    }, 300);
  }

  useEffect(() => {
    doSearch(query, sort, activeType, store);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, sort, activeType, store]);

  function handleQueryChange(q: string) {
    setQuery(q);
    setActiveType(null);
    onQueryChange?.(q);
  }

  // Exposed for suggestion clicks
  function setSearchQuery(q: string) {
    setQuery(q);
    onQueryChange?.(q);
    inputRef.current?.focus();
  }

  function handleBarcodeScan(barcode: string) {
    setScannerOpen(false);
    setQuery(barcode);
    onQueryChange?.(barcode);
  }

  // Expose setSearchQuery via ref-like pattern on window for suggestions
  useEffect(() => {
    (window as any).__setSearchQuery = setSearchQuery;
    return () => { delete (window as any).__setSearchQuery; };
  }, []);

  return (
    <div className="space-y-2">
      <div className="relative group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none transition-colors group-focus-within:text-primary" />
        <Input
          ref={inputRef}
          type="search"
          placeholder="Search products..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          className="text-base h-12 pl-11 pr-12 rounded-2xl border-border/60 bg-card shadow-sm transition-all duration-200 focus-visible:shadow-md focus-visible:border-primary/30 md:text-lg md:h-14 md:rounded-full"
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
          )}
          {isMobile && !loading && (
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors active:scale-90"
              aria-label="Scan barcode"
            >
              <ScanBarcode className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Barcode scanner overlay */}
      {scannerOpen && (
        <Suspense fallback={null}>
          <BarcodeScanner
            onScan={handleBarcodeScan}
            onClose={() => setScannerOpen(false)}
          />
        </Suspense>
      )}

      {/* Sort controls — show when there are results */}
      {query.length >= 2 && (
        <div className="flex items-center gap-2 px-0.5 animate-slide-up-fade">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex gap-1 flex-wrap">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSort(opt.value)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200 active:scale-95 ${
                  sort === opt.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Store filter pills */}
      {query.length >= 2 && (
        <div className="flex items-center gap-2 px-0.5 animate-slide-up-fade">
          <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {STORE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStore(opt.value)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-all duration-200 active:scale-95 ${
                  store === opt.value
                    ? opt.value
                      ? "ring-1"
                      : "bg-foreground/10 text-foreground ring-1 ring-foreground/20"
                    : "bg-transparent text-muted-foreground ring-1 ring-border hover:bg-muted/50"
                }`}
                style={
                  store === opt.value && opt.value
                    ? {
                        backgroundColor: `color-mix(in oklch, var(--store-${opt.value}) 15%, transparent)`,
                        color: `var(--store-${opt.value})`,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ["--tw-ring-color" as any]: `color-mix(in oklch, var(--store-${opt.value}) 30%, transparent)`,
                      }
                    : undefined
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Type filter pills */}
      {types.length > 0 && query.length >= 2 && (
        <div className="flex items-center gap-2 px-0.5 animate-slide-up-fade">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveType(null)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-all duration-200 active:scale-95 ${
                activeType === null
                  ? "bg-foreground/10 text-foreground ring-1 ring-foreground/20"
                  : "bg-transparent text-muted-foreground ring-1 ring-border hover:bg-muted/50"
              }`}
            >
              All
            </button>
            {types.map((type) => (
              <button
                key={type}
                onClick={() => setActiveType(activeType === type ? null : type)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-all duration-200 active:scale-95 ${
                  activeType === type
                    ? "bg-foreground/10 text-foreground ring-1 ring-foreground/20"
                    : "bg-transparent text-muted-foreground ring-1 ring-border hover:bg-muted/50"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
