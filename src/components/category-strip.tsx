"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface CategoryConfig {
  key: string;
  emoji: string;
  slug: string;
  accent: string;
}

interface CategoryStripProps {
  categories: CategoryConfig[];
  activeCategory: string;
  onSelect: (key: string) => void;
}

export function CategoryStrip({ categories, activeCategory, onSelect }: CategoryStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Auto-scroll active pill into view
  useEffect(() => {
    const pill = pillRefs.current.get(activeCategory);
    if (pill && scrollRef.current) {
      pill.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
    }
  }, [activeCategory]);

  return (
    <nav className="sticky top-[49px] md:top-[53px] z-30 bg-card/80 backdrop-blur-xl backdrop-saturate-150 border-b">
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide flex gap-2 px-4 py-2.5 max-w-6xl mx-auto"
      >
        {categories.map((cat) => (
          <button
            key={cat.key}
            ref={(el) => {
              if (el) pillRefs.current.set(cat.key, el);
            }}
            onClick={() => onSelect(cat.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors shrink-0",
              activeCategory === cat.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80 active:scale-95"
            )}
          >
            <span className="text-sm">{cat.emoji}</span>
            <span>{cat.key}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
