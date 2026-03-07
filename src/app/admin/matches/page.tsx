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
  product: { canonicalName: string };
  storeProduct: { name: string };
  store: { name: string };
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVerified, setShowVerified] = useState(false);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    const params = showVerified ? "" : "?verified=false";
    const res = await fetch(`/api/matches${params}`);
    const data = await res.json();
    setMatches(data.matches || []);
    setLoading(false);
  }, [showVerified]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  async function handleVerify(matchId: number) {
    await fetch("/api/matches", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, verified: true }),
    });
    fetchMatches();
  }

  async function handleReject(matchId: number) {
    await fetch("/api/matches", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId }),
    });
    fetchMatches();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Product Matching Review</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {matches.length} matches to review
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowVerified(!showVerified)}
        >
          {showVerified ? "Show Unverified" : "Show All"}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : matches.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No matches to review. Run ingestion and matching first.
        </div>
      ) : (
        <div className="grid gap-3">
          {matches.map((m) => (
            <MatchReviewCard
              key={m.match.id}
              matchId={m.match.id}
              canonicalName={m.product.canonicalName}
              storeProductName={m.storeProduct.name}
              storeName={m.store.name}
              matchMethod={m.match.matchMethod}
              confidence={m.match.confidence}
              onVerify={handleVerify}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
