import { cn } from "@/lib/utils";
import { formatKYD } from "@/lib/utils/currency";

interface PriceDisplayProps {
  price: number | null | undefined;
  salePrice?: number | null;
  isCheapest?: boolean;
  quantity?: number;
  className?: string;
  unitPrice?: number | null;
  unitPer?: string | null;
}

export function PriceDisplay({ price, salePrice, isCheapest, quantity = 1, className, unitPrice, unitPer }: PriceDisplayProps) {
  const effectivePrice = salePrice ?? price;
  if (effectivePrice == null) {
    return <span className="text-muted-foreground">--</span>;
  }

  const isOnSale = salePrice != null && salePrice < (price ?? Infinity);
  const displayPrice = effectivePrice * quantity;

  return (
    <div className={cn("tabular-nums", className)}>
      <div className={cn(isCheapest && "font-bold text-savings")}>
        {formatKYD(displayPrice)}
      </div>
      {isOnSale && (
        <div className="text-xs line-through text-muted-foreground">
          {formatKYD((price ?? 0) * quantity)}
        </div>
      )}
      {unitPrice != null && unitPer && (
        <div className="text-[10px] text-muted-foreground">
          {formatKYD(unitPrice)}/{unitPer}
        </div>
      )}
    </div>
  );
}
