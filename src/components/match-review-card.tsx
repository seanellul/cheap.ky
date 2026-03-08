"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StoreBadge } from "@/components/store-badge";
import { ProductImage } from "@/components/product-image";
import { ArrowRight, Check, X } from "lucide-react";

interface MatchReviewCardProps {
  matchId: number;
  canonicalName: string;
  productImageUrl: string | null;
  storeProductName: string;
  storeProductImageUrl: string | null;
  storeProductPrice: number | null;
  storeProductSize: string | null;
  storeName: string;
  storeId: string;
  matchMethod: string;
  confidence: number;
  onVerify: (matchId: number) => Promise<void>;
  onReject: (matchId: number) => Promise<void>;
}

export function MatchReviewCard({
  matchId,
  canonicalName,
  productImageUrl,
  storeProductName,
  storeProductImageUrl,
  storeProductPrice,
  storeProductSize,
  storeName,
  storeId,
  matchMethod,
  confidence,
  onVerify,
  onReject,
}: MatchReviewCardProps) {
  const [loading, setLoading] = useState(false);

  const confidencePercent = Math.round(confidence * 100);
  const confidenceBarColor =
    confidence >= 0.9
      ? "bg-green-500"
      : confidence >= 0.7
        ? "bg-yellow-500"
        : "bg-red-500";

  async function handleAction(action: (id: number) => Promise<void>) {
    setLoading(true);
    try {
      await action(matchId);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-4">
        {/* Side-by-side product comparison */}
        <div className="flex items-center gap-3">
          {/* Canonical product (left) */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ProductImage src={productImageUrl} alt={canonicalName} size="md" />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{canonicalName}</div>
              <Badge variant="outline" className="text-[10px] mt-1">Canonical</Badge>
            </div>
          </div>

          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />

          {/* Store product (right) */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ProductImage src={storeProductImageUrl} alt={storeProductName} size="md" />
            <div className="min-w-0">
              <div className="text-sm truncate">{storeProductName}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <StoreBadge storeId={storeId} size="sm" />
                {storeProductPrice != null && (
                  <span className="text-xs text-muted-foreground">
                    ${storeProductPrice.toFixed(2)}
                  </span>
                )}
                {storeProductSize && (
                  <span className="text-xs text-muted-foreground">
                    · {storeProductSize}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar: method, confidence, actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">{matchMethod}</Badge>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${confidenceBarColor}`}
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{confidencePercent}%</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-green-600 h-7 px-2"
              onClick={() => handleAction(onVerify)}
              disabled={loading}
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Verify
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 h-7 px-2"
              onClick={() => handleAction(onReject)}
              disabled={loading}
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Reject
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
