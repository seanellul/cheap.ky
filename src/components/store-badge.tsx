import { cn } from "@/lib/utils";

const STORE_COLORS: Record<string, { bg: string; text: string }> = {
  fosters: { bg: "bg-store-fosters/15", text: "text-store-fosters" },
  hurleys: { bg: "bg-store-hurleys/15", text: "text-store-hurleys" },
  kirkmarket: { bg: "bg-store-kirkmarket/15", text: "text-store-kirkmarket" },
  costuless: { bg: "bg-store-costuless/15", text: "text-store-costuless" },
  pricedright: { bg: "bg-store-pricedright/15", text: "text-store-pricedright" },
};

const STORE_NAMES: Record<string, string> = {
  fosters: "Foster's",
  hurleys: "Hurley's",
  kirkmarket: "Kirk Mkt",
  costuless: "Cost-U-Less",
  pricedright: "Priced Right",
};

interface StoreBadgeProps {
  storeId: string;
  size?: "sm" | "default";
  className?: string;
}

export function StoreBadge({ storeId, size = "default", className }: StoreBadgeProps) {
  const colors = STORE_COLORS[storeId] ?? { bg: "bg-muted", text: "text-foreground" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium whitespace-nowrap",
        colors.bg,
        colors.text,
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        className
      )}
    >
      {STORE_NAMES[storeId] ?? storeId}
    </span>
  );
}
