"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PriceChart } from "@/components/price-chart";
import { formatKYD } from "@/lib/utils/currency";
import { STORE_NAMES } from "@/components/price-comparison-row";

interface StorePrice {
  storeId: string;
  storeName: string;
  price: number | null;
  salePrice: number | null;
  name: string;
  sourceUrl: string | null;
}

interface ProductDetail {
  id: number;
  canonicalName: string;
  brand: string | null;
  size: string | null;
  imageUrl: string | null;
  storePrices: StorePrice[];
  priceHistory: Array<{
    date: string;
    [storeId: string]: number | string | null;
  }>;
}

export default function ProductPage() {
  const params = useParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/search?q=id:${params.id}`);
      // For now, we'll use a simpler endpoint approach
      setLoading(false);
    }
    load();
  }, [params.id]);

  // Placeholder until product detail API is wired
  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Product Detail</h1>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Product detail page - wire up the product detail API endpoint to populate this view with price history charts and store listings.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.canonicalName}
            className="w-24 h-24 object-cover rounded-lg"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold">{product.canonicalName}</h1>
          <div className="flex gap-2 mt-1">
            {product.brand && <Badge variant="outline">{product.brand}</Badge>}
            {product.size && <Badge variant="outline">{product.size}</Badge>}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
        </CardHeader>
        <CardContent>
          <PriceChart
            data={product.priceHistory}
            storeIds={product.storePrices.map((sp) => sp.storeId)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Store Listings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {product.storePrices.map((sp) => (
              <div
                key={sp.storeId}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <div className="font-medium text-sm">
                    {STORE_NAMES[sp.storeId] || sp.storeName}
                  </div>
                  <div className="text-xs text-muted-foreground">{sp.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">
                    {formatKYD(sp.salePrice ?? sp.price)}
                  </div>
                  {sp.salePrice && sp.price && sp.salePrice < sp.price && (
                    <div className="text-xs line-through text-muted-foreground">
                      {formatKYD(sp.price)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
