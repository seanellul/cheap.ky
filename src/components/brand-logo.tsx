import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: "sm" | "default" | "lg" | "xl";
  showIcon?: boolean;
  className?: string;
}

const SIZES = {
  sm: "text-base",
  default: "text-xl",
  lg: "text-2xl sm:text-3xl",
  xl: "text-3xl sm:text-4xl lg:text-5xl",
};

const ICON_SIZES = {
  sm: "h-5 w-5",
  default: "h-7 w-7",
  lg: "h-8 w-8 sm:h-9 sm:w-9",
  xl: "h-10 w-10 sm:h-12 sm:w-12",
};

export function BrandIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="7" className="fill-primary" />
      <text
        x="3.5"
        y="25"
        fontFamily="system-ui,-apple-system,sans-serif"
        fontWeight="800"
        fontSize="26"
        fill="white"
        letterSpacing="-1"
      >
        C
      </text>
      <circle cx="25" cy="21.5" r="3.5" className="fill-accent" />
    </svg>
  );
}

export function BrandLogo({ size = "default", showIcon = false, className }: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-bold tracking-tight", SIZES[size], className)}>
      {showIcon && <BrandIcon className={ICON_SIZES[size]} />}
      <span>
        <span className="text-primary">Cheap</span>
        <span className="text-accent">.</span>
        <span className="text-primary">ky</span>
      </span>
    </span>
  );
}
