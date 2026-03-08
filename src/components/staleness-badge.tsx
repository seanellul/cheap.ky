export type StalenessLevel = "fresh" | "aging" | "stale" | "unknown";

export function getStalenessInfo(updatedAt: string | null | undefined): {
  label: string;
  level: StalenessLevel;
} {
  if (!updatedAt) return { label: "Unknown", level: "unknown" };

  const now = Date.now();
  const updated = new Date(updatedAt).getTime();
  const diffMs = now - updated;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  if (diffHours < 1) {
    return { label: "Just updated", level: "fresh" };
  }
  if (diffHours < 24) {
    const h = Math.floor(diffHours);
    return { label: `Updated ${h}h ago`, level: "fresh" };
  }
  if (diffDays < 3) {
    const d = Math.floor(diffDays);
    return { label: `${d} day${d > 1 ? "s" : ""} old`, level: "aging" };
  }
  if (diffDays < 7) {
    const d = Math.floor(diffDays);
    return { label: `${d} days old`, level: "stale" };
  }
  return { label: "7+ days old", level: "stale" };
}

const levelStyles: Record<StalenessLevel, string> = {
  fresh: "text-savings",
  aging: "text-accent-foreground dark:text-accent",
  stale: "text-destructive",
  unknown: "text-muted-foreground",
};

const dotStyles: Record<StalenessLevel, string> = {
  fresh: "bg-savings",
  aging: "bg-accent",
  stale: "bg-destructive",
  unknown: "bg-muted-foreground",
};

interface StalenessBadgeProps {
  updatedAt: string | null | undefined;
  className?: string;
}

export function StalenessBadge({ updatedAt, className = "" }: StalenessBadgeProps) {
  const { label, level } = getStalenessInfo(updatedAt);

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] leading-none ${levelStyles[level]} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotStyles[level]}`} />
      {label}
    </span>
  );
}
