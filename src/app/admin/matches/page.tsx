"use client";

import { useState, useEffect, useCallback } from "react";
import { MatchReviewCard } from "@/components/match-review-card";
import { Button } from "@/components/ui/button";

interface MatchData {
  match: {
    id: number;
    matchMethod: string;
    confidence: number;
    verified: boolean;
  };
  product: { canonicalName: string; imageUrl: string | null };
  storeProduct: {
    name: string;
    imageUrl: string | null;
    price: number | null;
    size: string | null;
  };
  store: { name: string; id: string };
}

type ConfidenceFilter = "all" | "high" | "medium" | "low";
type MethodFilter = "all" | "upc" | "fuzzy_name" | "manual" | "ai";
type VerifiedFilter = "unverified" | "verified" | "all";

const CONFIDENCE_RANGES: Record<ConfidenceFilter, { min?: string; max?: string }> = {
  all: {},
  high: { min: "0.9" },
  medium: { min: "0.7", max: "0.9" },
  low: { max: "0.7" },
};

const PAGE_SIZE = 50;

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>("all");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");
  const [verifiedFilter, setVerifiedFilter] = useState<VerifiedFilter>("unverified");

  const fetchMatches = useCallback(async (offset = 0, append = false) => {
    if (!append) setLoading(true);

    const params = new URLSearchParams();
    const range = CONFIDENCE_RANGES[confidenceFilter];
    if (range.min) params.set("minConfidence", range.min);
    if (range.max) params.set("maxConfidence", range.max);
    if (methodFilter !== "all") params.set("matchMethod", methodFilter);
    if (verifiedFilter !== "all") params.set("verified", verifiedFilter === "verified" ? "true" : "false");
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));

    const res = await fetch(`/api/matches?${params}`);
    const data = await res.json();
    const newMatches = data.matches || [];

    if (append) {
      setMatches((prev) => [...prev, ...newMatches]);
    } else {
      setMatches(newMatches);
    }
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [confidenceFilter, methodFilter, verifiedFilter]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  async function handleVerify(matchId: number) {
    // Optimistic removal
    setMatches((prev) => prev.filter((m) => m.match.id !== matchId));
    setTotal((prev) => prev - 1);

    await fetch("/api/matches", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, verified: true }),
    });
  }

  async function handleReject(matchId: number) {
    // Optimistic removal
    setMatches((prev) => prev.filter((m) => m.match.id !== matchId));
    setTotal((prev) => prev - 1);

    await fetch("/api/matches", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId }),
    });
  }

  function handleLoadMore() {
    fetchMatches(matches.length, true);
  }

  const emptyMessage =
    confidenceFilter !== "all" || methodFilter !== "all" || verifiedFilter !== "all"
      ? "No matches found for these filters. Try adjusting your filters."
      : "No matches to review. Run ingestion and matching first.";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Product Matching Review</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Showing {matches.length} of {total} matches
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <select
          value={confidenceFilter}
          onChange={(e) => setConfidenceFilter(e.target.value as ConfidenceFilter)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All confidence</option>
          <option value="high">High (90%+)</option>
          <option value="medium">Medium (70-90%)</option>
          <option value="low">Low (&lt;70%)</option>
        </select>

        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value as MethodFilter)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All methods</option>
          <option value="upc">UPC</option>
          <option value="fuzzy_name">Fuzzy name</option>
          <option value="manual">Manual</option>
          <option value="ai">AI</option>
        </select>

        <select
          value={verifiedFilter}
          onChange={(e) => setVerifiedFilter(e.target.value as VerifiedFilter)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="unverified">Unverified only</option>
          <option value="verified">Verified only</option>
          <option value="all">All</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : matches.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-3">
          {matches.map((m) => (
            <MatchReviewCard
              key={m.match.id}
              matchId={m.match.id}
              canonicalName={m.product.canonicalName}
              productImageUrl={m.product.imageUrl}
              storeProductName={m.storeProduct.name}
              storeProductImageUrl={m.storeProduct.imageUrl}
              storeProductPrice={m.storeProduct.price}
              storeProductSize={m.storeProduct.size}
              storeName={m.store.name}
              storeId={m.store.id}
              matchMethod={m.match.matchMethod}
              confidence={m.match.confidence}
              onVerify={handleVerify}
              onReject={handleReject}
            />
          ))}

          {matches.length < total && (
            <div className="text-center py-4">
              <Button variant="outline" onClick={handleLoadMore}>
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
