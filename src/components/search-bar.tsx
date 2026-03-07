"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, ArrowUpDown, Tag, X } from "lucide-react";
import { Input } from "@/components/ui/input";

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

export function SearchBar({ onResults, onLoadingChange, onQueryChange, onFocusChange }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("relevance");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/search/categories")
      .then((r) => r.json())
      .then((data: CategoryOption[]) => setCategories(data))
      .catch(() => {});
  }, []);

  function doSearch(q: string, s: SortOption, cat: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length < 2 && !cat) {
      onResults([]);
      setLoading(false);
      onLoadingChange?.(false);
      return;
    }

    setLoading(true);
    onLoadingChange?.(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ sort: s });
        if (q.length >= 2) params.set("q", q);
        if (cat) params.set("category", cat);
        const res = await fetch(`/api/search?${params}`);
        const data = await res.json();
        onResults(data.results || []);
      } catch {
        onResults([]);
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    }, 300);
  }

  useEffect(() => {
    doSearch(query, sort, category);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, sort, category]);

  function handleQueryChange(q: string) {
    setQuery(q);
    onQueryChange?.(q);
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

  // Expose setSearchQuery via ref-like pattern on window for suggestions
  useEffect(() => {
    (window as any).__setSearchQuery = setSearchQuery;
    return () => { delete (window as any).__setSearchQuery; };
  }, []);

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
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          className="text-base h-12 pl-11 pr-12 rounded-2xl border-border/60 bg-card shadow-sm transition-all duration-200 focus-visible:shadow-md focus-visible:border-primary/30 md:text-lg md:h-14 md:rounded-full"
        />
        {loading && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
          </div>
        )}
      </div>

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
    </div>
  );
}
