"use client";

import { useState, useEffect } from "react";
import { Clock, X } from "lucide-react";
import {
  getSearchHistory,
  removeSearchEntry,
  type SearchHistoryEntry,
} from "@/lib/history";

interface RecentSearchesProps {
  onSelect: (query: string) => void;
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
        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Recent
        </p>
        <a
          href="/history"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
        </a>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {entries.map((entry) => (
          <button
            key={entry.query}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(entry.query)}
            className="group relative flex items-center gap-1.5 rounded-full border bg-muted/70 text-foreground/80 border-border/70 hover:bg-muted hover:text-foreground hover:border-primary/30 px-3 py-1.5 text-xs sm:text-sm font-medium transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-out hover:scale-105 hover:shadow-sm active:scale-95 cursor-pointer select-none"
          >
            <span>{entry.query}</span>
            <span
              role="button"
              onClick={(e) => handleRemove(e, entry.query)}
              className="rounded-full p-0.5 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="Remove search"
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
