"use client";

import { useState, useEffect } from "react";
import { Search, TrendingUp, Sparkles, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";
import { SearchBar } from "@/components/search-bar";
import { ProductCard } from "@/components/product-card";
import {
  PriceComparisonRow,
  PriceComparisonHeader,
} from "@/components/price-comparison-row";
import { SearchResultSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/empty-state";
import { ProductDetailDialog } from "@/components/product-detail-dialog";
import { BrandLogo } from "@/components/brand-logo";
import { FreshnessBadge } from "@/components/freshness-badge";
import { useCart } from "@/lib/contexts/cart-context";
import { formatKYD } from "@/lib/utils/currency";

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

interface Suggestions {
  categories: string[];
  trending: string[];
  staples: string[];
}

export default function HomePage() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const { refreshCart } = useCart();

  useEffect(() => {
    fetch("/api/search/suggestions")
      .then((r) => r.json())
      .then(setSuggestions)
      .catch(() => {});
  }, []);

  async function handleAddToCart(productId: number) {
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    refreshCart();
    const item = results.find((r) => r.id === productId);
    toast.success("Added to cart", {
      description: item?.name ?? "Item added",
      action: { label: "View Cart", onClick: () => window.location.href = "/cart" },
    });
  }

  function handleResults(r: SearchResult[]) {
    setResults(r);
    setHasSearched(true);
  }

  function handleSuggestionClick(term: string) {
    (window as any).__setSearchQuery?.(term);
  }

  const showSuggestions = !hasSearched && !loading && query.length < 2 && suggestions;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 px-6 py-8 md:py-12">
        <div className="relative">
          <h1>
            <BrandLogo size="lg" />
          </h1>
          <p className="text-muted-foreground text-sm mt-2 sm:text-base">
            Don&apos;t just shop &mdash; be <span className="font-semibold text-foreground">Cheap.ky</span>
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <p className="text-muted-foreground/70 text-xs sm:text-sm">
              Compare prices across Cayman grocery stores
            </p>
            <FreshnessBadge />
          </div>
        </div>
      </div>

      <SearchBar
        onResults={handleResults}
        onLoadingChange={setLoading}
        onQueryChange={setQuery}
      />

      {/* Suggestions — show before any search */}
      {showSuggestions && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Quick staples */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <ShoppingBasket className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Popular searches</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.staples.map((term) => (
                <button
                  key={term}
                  onClick={() => handleSuggestionClick(term)}
                  className="rounded-full border bg-card px-3 py-1.5 text-sm hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors capitalize"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          {/* Trending — biggest price gaps */}
          {suggestions.trending.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">Biggest price differences</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.trending.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleSuggestionClick(term)}
                    className="rounded-full border border-accent/20 bg-accent/5 px-3 py-1.5 text-sm hover:bg-accent/15 hover:border-accent/40 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          {suggestions.categories.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Browse by category</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleSuggestionClick(cat)}
                    className="rounded-full border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && <SearchResultSkeleton />}

      {/* Results summary */}
      {!loading && results.length > 0 && (
        <div className="text-sm text-muted-foreground px-1">
          {results.length} result{results.length === 1 ? "" : "s"} found
          {results.filter((r) => r.storeCount > 1).length > 0 && (
            <span>
              {" "}&middot; {results.filter((r) => r.storeCount > 1).length} compared across stores
            </span>
          )}
        </div>
      )}

      {/* Results - Mobile cards */}
      {!loading && results.length > 0 && (
        <>
          <div className="md:hidden space-y-2">
            {results.map((r, i) => (
              <ProductCard
                key={r.id}
                id={r.id}
                name={r.name}
                brand={r.brand}
                size={r.size}
                imageUrl={r.imageUrl}
                prices={r.prices}
                minPrice={r.minPrice}
                onAddToCart={handleAddToCart}
                onClickProduct={setSelectedProductId}
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>

          {/* Results - Desktop table */}
          <div className="hidden md:block border rounded-xl overflow-hidden">
            <table className="w-full">
              <PriceComparisonHeader />
              <tbody>
                {results.map((r) => (
                  <PriceComparisonRow
                    key={r.id}
                    id={r.id}
                    name={r.name}
                    brand={r.brand}
                    size={r.size}
                    imageUrl={r.imageUrl}
                    prices={r.prices}
                    minPrice={r.minPrice}
                    onAddToCart={handleAddToCart}
                    onClickProduct={setSelectedProductId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && hasSearched && results.length === 0 && (
        <EmptyState
          icon={Search}
          title="No products found"
          description="Try a different search term or check your spelling"
        />
      )}

      <ProductDetailDialog
        productId={selectedProductId}
        onClose={() => setSelectedProductId(null)}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}
