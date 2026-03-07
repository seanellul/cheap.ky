"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { container: "h-10 w-10", icon: "h-4 w-4" },
  md: { container: "h-12 w-12", icon: "h-5 w-5" },
  lg: { container: "h-16 w-16", icon: "h-6 w-6" },
};

export function ProductImage({ src, alt, size = "md", className }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const s = SIZES[size];

  if (!src || failed) {
    return (
      <div className={cn(s.container, "rounded-lg bg-muted shrink-0 flex items-center justify-center", className)}>
        <Package className={cn(s.icon, "text-muted-foreground/40")} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={cn(s.container, "rounded-lg object-cover shrink-0", className)}
    />
  );
}
