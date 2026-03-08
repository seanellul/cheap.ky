"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavourites } from "@/lib/contexts/favourites-context";
import { cn } from "@/lib/utils";

interface FavouriteButtonProps {
  productId: number;
  className?: string;
}

export function FavouriteButton({ productId, className }: FavouriteButtonProps) {
  const { toggleFavourite, isFavourited } = useFavourites();
  const active = isFavourited(productId);

  return (
    <Button
      size="icon-sm"
      variant="ghost"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleFavourite(productId);
      }}
      className={cn(
        "transition-all duration-200",
        active && "text-red-500 hover:text-red-600",
        className
      )}
      aria-label={active ? "Remove from favourites" : "Add to favourites"}
    >
      <Heart
        className={cn(
          "h-3.5 w-3.5 transition-transform duration-200",
          active && "fill-current animate-scale-bounce"
        )}
      />
    </Button>
  );
}
