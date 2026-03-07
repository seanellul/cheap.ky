import { ArrowDown, ArrowUp } from "lucide-react";
import { formatKYD } from "@/lib/utils/currency";

interface PriceChangeIndicatorProps {
  direction: "up" | "down" | null;
  amount: number;
}

export function PriceChangeIndicator({ direction, amount }: PriceChangeIndicatorProps) {
  if (!direction) return null;

  if (direction === "down") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-savings font-medium">
        <ArrowDown className="h-3 w-3" />
        {formatKYD(amount)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-red-500 font-medium">
      <ArrowUp className="h-3 w-3" />
      {formatKYD(amount)}
    </span>
  );
}
