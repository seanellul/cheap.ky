"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MatchReviewCardProps {
  matchId: number;
  canonicalName: string;
  storeProductName: string;
  storeName: string;
  matchMethod: string;
  confidence: number;
  onVerify: (matchId: number) => void;
  onReject: (matchId: number) => void;
}

export function MatchReviewCard({
  matchId,
  canonicalName,
  storeProductName,
  storeName,
  matchMethod,
  confidence,
  onVerify,
  onReject,
}: MatchReviewCardProps) {
  const confidenceColor =
    confidence >= 0.9
      ? "bg-green-100 text-green-800"
      : confidence >= 0.7
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{canonicalName}</div>
            <div className="text-xs text-muted-foreground mt-1">
              matches &rarr;
            </div>
            <div className="text-sm truncate">{storeProductName}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {storeName}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {matchMethod}
              </Badge>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${confidenceColor}`}
              >
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="text-green-600"
              onClick={() => onVerify(matchId)}
            >
              Verify
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600"
              onClick={() => onReject(matchId)}
            >
              Reject
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
