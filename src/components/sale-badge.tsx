import { Tag } from "lucide-react";

export function SaleBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full bg-savings/15 px-1.5 py-0.5 text-[10px] font-semibold text-savings leading-none ${className ?? ""}`}
    >
      <Tag className="h-2.5 w-2.5" />
      Sale
    </span>
  );
}
