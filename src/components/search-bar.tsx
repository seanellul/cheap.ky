"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { track } from "@/lib/utils/track";

interface SearchResult {
  id: number;
  name: string;
  brand: string | null;
  size: string | null;
  imageUrl: string | null;
  prices: Record<string, { price: number | null; salePrice: number | null; name: string }>;
}

interface SearchBarProps {
  onResults: (results: SearchResult[]) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export function SearchBar({ onResults, onLoadingChange }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      onResults([]);
      setLoading(false);
      onLoadingChange?.(false);
      return;
    }

    setLoading(true);
    onLoadingChange?.(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const results = data.results || [];
        onResults(results);
        track("search", query, { resultCount: results.length });
      } catch {
        onResults([]);
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        placeholder="Search products (e.g., milk, bread, chicken)..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="text-base py-3 pl-10 rounded-full md:text-lg md:py-6"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
