"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface ProductRatingProps {
  productId: number;
  storeId: string;
  initialUp: number;
  initialDown: number;
}

type Vote = "up" | "down" | null;

export function ProductRating({
  productId,
  storeId,
  initialUp,
  initialDown,
}: ProductRatingProps) {
  const storageKey = `rating:${productId}:${storeId}`;

  function getStoredVote(): Vote {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(storageKey) as Vote;
    } catch {
      return null;
    }
  }

  const [up, setUp] = useState(initialUp);
  const [down, setDown] = useState(initialDown);
  const [vote, setVote] = useState<Vote>(getStoredVote);
  const [submitting, setSubmitting] = useState(false);

  async function handleVote(direction: "up" | "down") {
    if (submitting) return;

    const newRating = direction === "up" ? 1 : -1;
    const wasVoted = vote === direction;

    // If clicking the same button, we can't "unvote" with the current schema,
    // so just ignore
    if (wasVoted) return;

    // Optimistic update
    const prevUp = up;
    const prevDown = down;
    const prevVote = vote;

    if (direction === "up") {
      setUp((u) => u + 1);
      if (vote === "down") setDown((d) => d - 1);
    } else {
      setDown((d) => d + 1);
      if (vote === "up") setUp((u) => u - 1);
    }
    setVote(direction);

    try {
      localStorage.setItem(storageKey, direction);
    } catch {
      // localStorage unavailable
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, storeId, rating: newRating }),
      });

      if (res.ok) {
        const ratings = await res.json();
        const storeRating = ratings[storeId];
        if (storeRating) {
          setUp(storeRating.up);
          setDown(storeRating.down);
        }
      } else {
        // Revert optimistic update
        setUp(prevUp);
        setDown(prevDown);
        setVote(prevVote);
        try {
          if (prevVote) localStorage.setItem(storageKey, prevVote);
          else localStorage.removeItem(storageKey);
        } catch {
          // localStorage unavailable
        }
      }
    } catch {
      setUp(prevUp);
      setDown(prevDown);
      setVote(prevVote);
    } finally {
      setSubmitting(false);
    }
  }

  const hasVotes = up > 0 || down > 0;

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        onClick={() => handleVote("up")}
        disabled={submitting}
        className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs transition-colors ${
          vote === "up"
            ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
            : "text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-500/10"
        } disabled:opacity-50`}
        aria-label="Worth it"
        title="Worth it here"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
        {hasVotes && up > 0 && <span>{up}</span>}
      </button>
      <button
        onClick={() => handleVote("down")}
        disabled={submitting}
        className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs transition-colors ${
          vote === "down"
            ? "text-muted-foreground bg-muted"
            : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted"
        } disabled:opacity-50`}
        aria-label="Not worth it"
        title="Not worth it here"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
        {hasVotes && down > 0 && <span>{down}</span>}
      </button>
    </span>
  );
}
