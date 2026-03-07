"use client";

import { useEffect, useState, useRef } from "react";

interface BubbleItem {
  label: string;
  weight: number; // 0-1, determines size
}

interface SearchBubblesProps {
  onSelect: (term: string) => void;
}

// Assign weights: staples get high weights, trending medium, categories lower
function buildBubbles(data: {
  categories: string[];
  trending: string[];
  staples: string[];
}): BubbleItem[] {
  const items: BubbleItem[] = [];

  // Staples — most popular, biggest bubbles
  const topStaples = data.staples.slice(0, 12);
  topStaples.forEach((s, i) => {
    items.push({ label: s, weight: 1 - i * 0.05 });
  });

  // Trending — medium bubbles
  data.trending.slice(0, 5).forEach((s, i) => {
    items.push({ label: s, weight: 0.65 - i * 0.05 });
  });

  // Categories — smaller bubbles
  data.categories.slice(0, 6).forEach((s, i) => {
    items.push({ label: s, weight: 0.45 - i * 0.03 });
  });

  // Shuffle for organic feel
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return items;
}

function sizeClass(weight: number): string {
  if (weight >= 0.85) return "text-base sm:text-lg px-4 py-2 font-semibold";
  if (weight >= 0.7) return "text-sm sm:text-base px-3.5 py-1.5 font-semibold";
  if (weight >= 0.55) return "text-sm px-3 py-1.5 font-medium";
  if (weight >= 0.4) return "text-xs sm:text-sm px-2.5 py-1 font-medium";
  return "text-xs px-2 py-1";
}

function colorClass(weight: number): string {
  if (weight >= 0.85)
    return "bg-primary/15 text-primary border-primary/30 hover:bg-primary/25 hover:border-primary/50 dark:bg-primary/20 dark:text-primary dark:border-primary/40";
  if (weight >= 0.7)
    return "bg-primary/10 text-primary border-primary/25 hover:bg-primary/20 hover:border-primary/40 dark:bg-primary/15 dark:text-primary/90 dark:border-primary/35";
  if (weight >= 0.55)
    return "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80 hover:border-border";
  if (weight >= 0.4)
    return "bg-muted text-foreground/80 border-border hover:bg-muted/80 hover:text-foreground";
  return "bg-muted/70 text-foreground/60 border-border/70 hover:bg-muted hover:text-foreground/80";
}

export function SearchBubbles({ onSelect }: SearchBubblesProps) {
  const [bubbles, setBubbles] = useState<BubbleItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/search/suggestions")
      .then((r) => r.json())
      .then((data) => {
        setBubbles(buildBubbles(data));
        setLoaded(true);
      })
      .catch(() => {});
  }, []);

  if (!loaded || bubbles.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 py-4">
        {bubbles.map((bubble, i) => {
          // Stagger animation delays and vary duration for organic feel
          const delay = (i * 0.15) % 3;
          const duration = 3 + (i % 4) * 0.7;
          const yOffset = 2 + (i % 3) * 2;

          return (
            <button
              key={bubble.label}
              onClick={() => onSelect(bubble.label)}
              className={`
                relative rounded-full border transition-all duration-300
                hover:scale-105 hover:shadow-md active:scale-95
                capitalize cursor-pointer select-none
                ${sizeClass(bubble.weight)}
                ${colorClass(bubble.weight)}
              `}
              style={{
                animation: `bubble-float ${duration}s ease-in-out ${delay}s infinite`,
                ["--float-y" as string]: `${yOffset}px`,
                opacity: 0,
                animationFillMode: "forwards",
              }}
            >
              {bubble.label}
            </button>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes bubble-float {
          0% {
            opacity: 1;
            transform: translateY(0px);
          }
          50% {
            opacity: 1;
            transform: translateY(calc(-1 * var(--float-y)));
          }
          100% {
            opacity: 1;
            transform: translateY(0px);
          }
        }
      `}</style>
    </div>
  );
}
