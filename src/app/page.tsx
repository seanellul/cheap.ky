"use client";

import { useState } from "react";
import { Search } from "lucide-react";
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

interface SearchResult {
  id: number;
  name: string;
  brand: string | null;
  size: string | null;
  imageUrl: string | null;
  prices: Record<string, { price: number | null; salePrice: number | null; name: string }>;
}

export default function HomePage() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const { refreshCart } = useCart();

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

      <SearchBar onResults={handleResults} onLoadingChange={setLoading} />

      {/* Loading */}
      {loading && <SearchResultSkeleton />}

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
