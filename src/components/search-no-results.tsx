"use client";

import { Search } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import {
  PriceComparisonRow,
  PriceComparisonHeader,
} from "@/components/price-comparison-row";
import { SearchBubbles } from "@/components/search-bubbles";

interface SearchResult {
  id: number;
  name: string;
  brand: string | null;
  size: string | null;
  imageUrl: string | null;
  minPrice: number | null;
  storeCount: number;
  prices: Record<string, { price: number | null; salePrice: number | null; name: string; updatedAt?: string | null }>;
  priceChanges?: Record<string, { direction: "up" | "down"; amount: number }>;
}

interface SearchNoResultsProps {
  query: string;
  suggestions: SearchResult[];
  onSelect: (term: string) => void;
  onClickProduct?: (productId: number) => void;
  onAddToCart?: (productId: number) => void;
}

export function SearchNoResults({ query, suggestions, onSelect, onClickProduct, onAddToCart }: SearchNoResultsProps) {
  const displaySuggestions = suggestions.slice(0, 4);

  return (
    <div className="space-y-6 animate-slide-up-fade">
      {/* No results message */}
      <div className="flex flex-col items-center text-center py-8">
        <div className="rounded-2xl bg-muted/60 p-5 mb-4">
          <Search className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold mb-1">
          No results for &ldquo;{query}&rdquo;
        </h3>
        <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
          Check your spelling or try one of these
        </p>
      </div>

      {/* Similar products */}
      {displaySuggestions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground px-1">
            Similar products
          </h4>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {displaySuggestions.map((r) => (
              <ProductCard
                key={r.id}
                id={r.id}
                name={r.name}
                brand={r.brand}
                size={r.size}
                imageUrl={r.imageUrl}
                prices={r.prices}
                priceChanges={r.priceChanges}
                minPrice={r.minPrice}
                onAddToCart={onAddToCart}
                onClickProduct={onClickProduct}
              />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block border rounded-xl overflow-hidden">
            <table className="w-full">
              <PriceComparisonHeader />
              <tbody>
                {displaySuggestions.map((r) => (
                  <PriceComparisonRow
                    key={r.id}
                    id={r.id}
                    name={r.name}
                    brand={r.brand}
                    size={r.size}
                    imageUrl={r.imageUrl}
                    prices={r.prices}
                    priceChanges={r.priceChanges}
                    minPrice={r.minPrice}
                    onAddToCart={onAddToCart}
                    onClickProduct={onClickProduct}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Popular searches */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground px-1 text-center">
          Try searching for
        </h4>
        <SearchBubbles onSelect={onSelect} />
      </div>
    </div>
  );
}
