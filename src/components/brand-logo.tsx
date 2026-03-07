import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: "sm" | "default" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  sm: "text-base",
  default: "text-xl",
  lg: "text-2xl sm:text-3xl",
  xl: "text-3xl sm:text-4xl lg:text-5xl",
};

export function BrandLogo({ size = "default", className }: BrandLogoProps) {
  return (
    <span className={cn("font-bold tracking-tight", SIZES[size], className)}>
      <span className="text-primary">Cheap</span>
      <span className="text-accent">.</span>
      <span className="text-primary">ky</span>
    </span>
  );
}
