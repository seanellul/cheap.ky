"use client";

import { useState, useEffect } from "react";
import { Clock, X, ChevronRight } from "lucide-react";
import {
  getSearchHistory,
  removeSearchEntry,
  type SearchHistoryEntry,
} from "@/lib/history";

interface RecentSearchesProps {
  onSelect: (query: string) => void;
}

function timeAgo(timestamp: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(timestamp).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function RecentSearches({ onSelect }: RecentSearchesProps) {
  const [entries, setEntries] = useState<SearchHistoryEntry[]>([]);

  useEffect(() => {
    const history = getSearchHistory();
    setEntries(history.slice(0, 5));
  }, []);

  function handleRemove(e: React.MouseEvent, query: string) {
    e.preventDefault();
    e.stopPropagation();
    removeSearchEntry(query);
    setEntries((prev) =>
      prev.filter(
        (entry) => entry.query.toLowerCase() !== query.toLowerCase()
      )
    );
  }

  if (entries.length === 0) return null;

  return (
    <div className="space-y-1.5 animate-slide-up-fade">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground font-medium">
          Recent searches
        </p>
        <a
          href="/history"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
        >
          View all
          <ChevronRight className="h-3 w-3" />
        </a>
      </div>
      <div className="space-y-1.5">
        {entries.map((entry) => (
          <button
            key={entry.query}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(entry.query)}
            className="group w-full flex items-center gap-3 rounded-2xl border bg-card p-3 hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.99] text-left"
          >
            <div className="rounded-lg bg-muted/60 p-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{entry.query}</div>
              <div className="text-xs text-muted-foreground">
                {entry.resultCount} result
                {entry.resultCount === 1 ? "" : "s"} &middot;{" "}
                {timeAgo(entry.timestamp)}
              </div>
            </div>
            <div
              role="button"
              onClick={(e) => handleRemove(e, entry.query)}
              className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 max-sm:opacity-60"
              aria-label="Remove search"
            >
              <X className="h-3.5 w-3.5" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
