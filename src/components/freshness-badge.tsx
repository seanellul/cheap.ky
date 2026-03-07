"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export function FreshnessBadge() {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/freshness")
      .then((r) => r.json())
      .then((d) => setLastUpdated(d.lastUpdated))
      .catch(() => {});
  }, []);

  if (!lastUpdated) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/70">
      <Clock className="h-3 w-3" />
      Prices updated {timeAgo(lastUpdated)}
    </span>
  );
}
