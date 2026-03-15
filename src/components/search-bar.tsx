"use client";

import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef, lazy, Suspense } from "react";
import { Search, Loader2, ArrowUpDown, ScanBarcode, Filter, Store, Clock, Tag, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { addSearchEntry, getSearchHistory } from "@/lib/history";
import { ScannerErrorBoundary } from "@/components/scanner-error-boundary";
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

interface CategoryOption {
  name: string;
  slug: string;
}

type SortOption = "relevance" | "price_asc" | "price_desc" | "stores";

export interface SearchBarHandle {
  setQuery: (q: string) => void;
}

interface SearchBarProps {
  onResults: (results: SearchResult[]) => void;
  onLoadingChange?: (loading: boolean) => void;
  onQueryChange?: (query: string) => void;
  onFocusChange?: (focused: boolean) => void;
  onSuggestions?: (suggestions: SearchResult[]) => void;
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-foreground">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

interface AutocompleteDropdownProps {
  recentSuggestions: string[];
  suggestions: string[];
  catSuggestions: string[];
  sectionCount: number;
  activeIndex: number;
  query: string;
  onSelect: (value: string) => void;
}

function AutocompleteDropdown({ recentSuggestions, suggestions, catSuggestions, sectionCount, activeIndex, query, onSelect }: AutocompleteDropdownProps) {
  let itemIndex = 0;

  return (
    <div
      id="autocomplete-list"
      role="listbox"
      className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border bg-card shadow-lg overflow-hidden animate-slide-up-fade"
    >
      {recentSuggestions.length > 0 && (
        <>
          {sectionCount > 1 && (
            <div className="px-3 pt-2 pb-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Recent</div>
          )}
          {recentSuggestions.map((item) => {
            const idx = itemIndex++;
            return (
              <button
                key={`recent-${item}`}
                role="option"
                aria-selected={activeIndex === idx}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelect(item)}
                className={`flex items-center gap-3 w-full px-3 min-h-[44px] text-left text-sm transition-colors ${
                  activeIndex === idx ? "bg-muted" : "hover:bg-muted/50"
                }`}
              >
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground truncate">
                  <HighlightMatch text={item} query={query} />
                </span>
              </button>
            );
          })}
        </>
      )}

      {suggestions.length > 0 && (
        <>
          {sectionCount > 1 && (
            <div className="px-3 pt-2 pb-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Products</div>
          )}
          {suggestions.map((item) => {
            const idx = itemIndex++;
            return (
              <button
                key={`product-${item}`}
                role="option"
                aria-selected={activeIndex === idx}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelect(item)}
                className={`flex items-center gap-3 w-full px-3 min-h-[44px] text-left text-sm transition-colors ${
                  activeIndex === idx ? "bg-muted" : "hover:bg-muted/50"
                }`}
              >
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground truncate">
                  <HighlightMatch text={item} query={query} />
                </span>
              </button>
            );
          })}
        </>
      )}

      {catSuggestions.length > 0 && (
        <>
          {sectionCount > 1 && (
            <div className="px-3 pt-2 pb-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Categories</div>
          )}
          {catSuggestions.map((item) => {
            const idx = itemIndex++;
            return (
              <button
                key={`cat-${item}`}
                role="option"
                aria-selected={activeIndex === idx}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelect(item)}
                className={`flex items-center gap-3 w-full px-3 min-h-[44px] text-left text-sm transition-colors ${
                  activeIndex === idx ? "bg-muted" : "hover:bg-muted/50"
                }`}
              >
                <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground truncate">
                  <HighlightMatch text={item} query={query} />
                </span>
              </button>
            );
          })}
        </>
      )}
    </div>
  );
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

export const SearchBar = forwardRef<SearchBarHandle, SearchBarProps>(function SearchBar({ onResults, onLoadingChange, onQueryChange, onFocusChange, onSuggestions }, ref) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("relevance");
  const [store, setStore] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [types, setTypes] = useState<string[]>([]);
  const [activeType, setActiveType] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [catSuggestions, setCatSuggestions] = useState<string[]>([]);
  const [recentSuggestions, setRecentSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const acDebounceRef = useRef<NodeJS.Timeout>(null);
  const acAbortRef = useRef<AbortController | null>(null);
  const hasSearchedRef = useRef(false);
  const lastResultCountRef = useRef(0);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768 && /Mobi|Android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    fetch("/api/search/categories")
      .then((r) => r.json())
      .then((data: CategoryOption[]) => setCategories(data))
      .catch(() => {});
  }, []);

  function doSearch(q: string, s: SortOption, type: string | null, storeId: string, cat: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length < 2 && !cat) {
      onResults([]);
      setTypes([]);
      setLoading(false);
      onLoadingChange?.(false);
      hasSearchedRef.current = false;
      return;
    }

    setLoading(true);
    onLoadingChange?.(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ sort: s });
        if (q.length >= 2) params.set("q", q);
        if (type) params.set("type", type);
        if (storeId) params.set("store", storeId);
        if (cat) params.set("category", cat);
        const res = await fetch(`/api/search?${params}`);
        const data = await res.json();
        const results = data.results || [];
        onResults(results);
        onSuggestions?.(data.suggestions || []);
        if (data.types) setTypes(data.types);
        hasSearchedRef.current = true;
        lastResultCountRef.current = results.length;
        setShowDropdown(false);
      } catch {
        onResults([]);
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    }, 300);
  }

  useEffect(() => {
    doSearch(query, sort, activeType, store, category);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, sort, activeType, store, category]);

  // Autocomplete fetching
  const fetchAutocomplete = useCallback((q: string) => {
    if (acDebounceRef.current) clearTimeout(acDebounceRef.current);
    if (acAbortRef.current) acAbortRef.current.abort();

    if (q.length < 1 || /^\d+$/.test(q)) {
      setSuggestions([]);
      setCatSuggestions([]);
      setRecentSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const history = getSearchHistory();
    const matchingRecents = history
      .filter((e) => e.query.toLowerCase().includes(q.toLowerCase()) && e.query.toLowerCase() !== q.toLowerCase())
      .slice(0, 3)
      .map((e) => e.query);
    setRecentSuggestions(matchingRecents);

    acDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      acAbortRef.current = controller;
      try {
        const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setSuggestions(data.products || []);
        setCatSuggestions(data.categories || []);
        const hasAny = matchingRecents.length > 0 || (data.products?.length > 0) || (data.categories?.length > 0);
        setShowDropdown(hasAny);
        setActiveIndex(-1);
      } catch {
        // Aborted or network error
      }
    }, 150);
  }, []);

  useEffect(() => {
    if (query.length >= 1 && !hasSearchedRef.current) {
      fetchAutocomplete(query);
    } else {
      setSuggestions([]);
      setCatSuggestions([]);
      setRecentSuggestions([]);
      setShowDropdown(false);
    }
    return () => {
      if (acDebounceRef.current) clearTimeout(acDebounceRef.current);
    };
  }, [query, fetchAutocomplete]);

  // Build flat list of all suggestion items for keyboard nav
  const allItems: { type: "recent" | "product" | "category"; value: string }[] = [];
  recentSuggestions.forEach((v) => allItems.push({ type: "recent", value: v }));
  suggestions.forEach((v) => allItems.push({ type: "product", value: v }));
  catSuggestions.forEach((v) => allItems.push({ type: "category", value: v }));

  const sectionCount = [recentSuggestions.length > 0, suggestions.length > 0, catSuggestions.length > 0].filter(Boolean).length;

  function saveToHistory(q: string) {
    if (q.length >= 2) {
      addSearchEntry(q, lastResultCountRef.current);
    }
  }

  function selectSuggestion(value: string) {
    setQuery(value);
    onQueryChange?.(value);
    setActiveType(null);
    setShowDropdown(false);
    setActiveIndex(-1);
    hasSearchedRef.current = false;
    saveToHistory(value);
    inputRef.current?.focus();
  }

  function handleQueryChange(q: string) {
    setQuery(q);
    setActiveType(null);
    hasSearchedRef.current = false;
    onQueryChange?.(q);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      if (showDropdown && activeIndex >= 0 && allItems.length > 0) {
        e.preventDefault();
        selectSuggestion(allItems[activeIndex].value);
      } else {
        saveToHistory(query);
        setShowDropdown(false);
      }
      return;
    }

    if (!showDropdown || allItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % allItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? allItems.length - 1 : prev - 1));
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  }

  function handleCategorySelect(slug: string) {
    setCategory(category === slug ? "" : slug);
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

  useImperativeHandle(ref, () => ({
    setQuery: setSearchQuery,
  }));

  const isSearchActive = query.length >= 2 || !!category;

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
          onFocus={() => {
            onFocusChange?.(true);
            if (query.length >= 1 && allItems.length > 0 && !hasSearchedRef.current) {
              setShowDropdown(true);
            }
          }}
          onBlur={() => {
            onFocusChange?.(false);
            setTimeout(() => setShowDropdown(false), 150);
          }}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls="autocomplete-list"
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

        {/* Autocomplete dropdown */}
        {showDropdown && allItems.length > 0 && (
          <AutocompleteDropdown
            recentSuggestions={recentSuggestions}
            suggestions={suggestions}
            catSuggestions={catSuggestions}
            sectionCount={sectionCount}
            activeIndex={activeIndex}
            query={query}
            onSelect={selectSuggestion}
          />
        )}
      </div>

      {/* Barcode scanner overlay */}
      {scannerOpen && (
        <ScannerErrorBoundary onClose={() => setScannerOpen(false)}>
          <Suspense fallback={null}>
            <BarcodeScanner
              onScan={handleBarcodeScan}
              onClose={() => setScannerOpen(false)}
            />
          </Suspense>
        </ScannerErrorBoundary>
      )}

      {/* Category filter pills */}
      {categories.length > 0 && isSearchActive && (
        <div className="flex items-center gap-2 px-0.5 animate-slide-up-fade">
          <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-0.5">
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => handleCategorySelect(cat.slug)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200 active:scale-95 whitespace-nowrap ${
                  category === cat.slug
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat.name}
                {category === cat.slug && (
                  <X className="inline-block h-3 w-3 ml-1 -mr-0.5" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sort controls */}
      {isSearchActive && (
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
});
