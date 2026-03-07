"use client";

import { ReactNode } from "react";
import { ChevronDown, ShoppingCart, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoreBadge } from "@/components/store-badge";
import { cn } from "@/lib/utils";
import type { CategoryConfig } from "@/components/category-strip";

export interface StoreWin {
  storeId: string;
  wins: number;
}

interface AisleSectionProps {
  category: CategoryConfig;
  itemCount: number;
  isOpen: boolean;
  onToggle: () => void;
  winnerSummary: string;
  storeWins?: StoreWin[];
  onAddAll: () => void;
  isAddingAll: boolean;
  children: ReactNode;
}

export function AisleSection({
  category,
  itemCount,
  isOpen,
  onToggle,
  winnerSummary,
  storeWins,
  onAddAll,
  isAddingAll,
  children,
}: AisleSectionProps) {
  return (
    <section id={category.slug} className="scroll-mt-28 mb-4">
      {/* Header */}
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors border-l-4",
          category.accent,
          "hover:bg-muted/40 active:bg-muted/60"
        )}
        onClick={onToggle}
      >
        <span className="text-xl">{category.emoji}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-base sm:text-lg">{category.key}</h2>
            <span className="bg-muted rounded-full px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {itemCount}
            </span>
          </div>
          {winnerSummary && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate sm:hidden">
              {winnerSummary}
            </p>
          )}
        </div>

        {/* Store win breakdown — desktop only, shown when collapsed */}
        {!isOpen && storeWins && storeWins.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 flex-1 justify-end mr-2">
            {storeWins.map((sw) => (
              <div
                key={sw.storeId}
                className="flex items-center gap-1 text-xs text-muted-foreground"
              >
                <StoreBadge storeId={sw.storeId} size="sm" />
                <span className="tabular-nums font-medium flex items-center gap-0.5">
                  <Trophy className="h-2.5 w-2.5" />
                  {sw.wins}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Winner summary — desktop, when collapsed, no storeWins */}
        {!isOpen && (!storeWins || storeWins.length === 0) && winnerSummary && (
          <p className="hidden sm:block text-[11px] text-muted-foreground flex-1 text-right mr-2">
            {winnerSummary}
          </p>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {isOpen && (
            <Button
              variant="outline"
              size="xs"
              className="gap-1 text-[11px]"
              onClick={(e) => {
                e.stopPropagation();
                onAddAll();
              }}
              disabled={isAddingAll}
            >
              {isAddingAll ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ShoppingCart className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">Add all cheapest</span>
              <span className="sm:hidden">Add all</span>
            </Button>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </div>

      {/* Collapsible body */}
      {isOpen && (
        <div className="pt-2 animate-slide-up-fade">{children}</div>
      )}
    </section>
  );
}
