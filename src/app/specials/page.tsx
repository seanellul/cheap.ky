"use client";

import { useState, useEffect } from "react";
import { Tag, Store } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { StoreBadge } from "@/components/store-badge";
import { SaleBadge } from "@/components/sale-badge";
import { EmptyState } from "@/components/empty-state";
import { formatKYD } from "@/lib/utils/currency";

interface SpecialItem {
  storeProductId: number;
  productId: number | null;
  name: string;
  brand: string | null;
  size: string | null;
  price: number | null;
  salePrice: number | null;
  imageUrl: string | null;
  sourceUrl: string | null;
}

interface StoreGroup {
  storeId: string;
  storeName: string;
  items: SpecialItem[];
}

export default function SpecialsPage() {
  const [stores, setStores] = useState<StoreGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStore, setActiveStore] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/specials")
      .then((r) => r.json())
      .then((data) => {
        setStores(data.stores || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <EmptyState
        icon={Tag}
        title="No specials right now"
        description="Check back soon — we update deals as stores change their prices."
        actionLabel="Browse products"
        actionHref="/"
      />
    );
  }

  const filtered = activeStore
    ? stores.filter((s) => s.storeId === activeStore)
    : stores;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-savings/5 via-savings/10 to-accent/5 px-4 py-3.5 sm:px-8 sm:py-6">
        <div className="relative">
          <h1 className="text-base sm:text-xl font-bold tracking-tight">
            This week&apos;s deals
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5 sm:text-sm">
            Sale prices across Cayman grocery stores
          </p>
        </div>
      </section>

      {/* Store filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setActiveStore(null)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            !activeStore
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          All stores
        </button>
        {stores.map((s) => (
          <button
            key={s.storeId}
            onClick={() => setActiveStore(s.storeId)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeStore === s.storeId
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {s.storeName} ({s.items.length})
          </button>
        ))}
      </div>

      {/* Deals grouped by store */}
      {filtered.map((store) => (
        <section key={store.storeId} className="space-y-3">
          <div className="flex items-center gap-2">
            <StoreBadge storeId={store.storeId} />
            <span className="text-xs text-muted-foreground">
              {store.items.length} deal{store.items.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {store.items.map((item) => {
              const savings =
                item.price != null && item.salePrice != null
                  ? item.price - item.salePrice
                  : 0;

              return (
                <div
                  key={item.storeProductId}
                  className="flex items-start gap-3 rounded-xl border bg-card p-3"
                >
                  <ProductImage
                    src={item.imageUrl}
                    alt={item.name}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1.5">
                      <div className="font-semibold text-sm leading-snug line-clamp-2 flex-1">
                        {item.name}
                      </div>
                      <SaleBadge className="shrink-0 mt-0.5" />
                    </div>
                    {(item.brand || item.size) && (
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {[item.brand, item.size].filter(Boolean).join(" · ")}
                      </div>
                    )}
                    <div className="flex items-baseline gap-2 mt-1.5">
                      {item.salePrice != null && (
                        <span className="font-bold text-savings text-sm">
                          {formatKYD(item.salePrice)}
                        </span>
                      )}
                      {item.price != null && item.salePrice != null && (
                        <span className="text-xs line-through text-muted-foreground">
                          {formatKYD(item.price)}
                        </span>
                      )}
                      {savings > 0.01 && (
                        <span className="text-[10px] font-semibold text-savings bg-savings/10 rounded-full px-1.5 py-0.5">
                          Save {formatKYD(savings)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
