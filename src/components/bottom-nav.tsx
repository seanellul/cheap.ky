"use client";

import { usePathname } from "next/navigation";
import { Search, ShoppingCart, ArrowLeftRight, ListChecks, LayoutGrid } from "lucide-react";
import { useCart } from "@/lib/contexts/cart-context";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", icon: Search, label: "Search" },
  { href: "/category", icon: LayoutGrid, label: "Browse" },
  { href: "/compare", icon: ArrowLeftRight, label: "Compare" },
  { href: "/staples", icon: ListChecks, label: "Staples" },
  { href: "/cart", icon: ShoppingCart, label: "Cart", showBadge: true },
];

export function BottomNav() {
  const pathname = usePathname();
  const { cartCount } = useCart();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-[env(safe-area-inset-bottom)]">
      {/* Frosted glass background */}
      <div className="border-t bg-card/80 backdrop-blur-xl backdrop-saturate-150">
        <div className="flex items-center justify-around px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 py-2 px-4 min-h-[52px] min-w-[52px] transition-all duration-200",
                  isActive ? "text-primary" : "text-muted-foreground active:scale-90"
                )}
              >
                {/* Active indicator pill */}
                {isActive && (
                  <span className="absolute top-1.5 left-1/2 -translate-x-1/2 h-[3px] w-5 rounded-full bg-primary animate-scale-bounce" />
                )}
                <span className="relative">
                  <item.icon
                    className={cn(
                      "h-[22px] w-[22px] transition-all duration-200",
                      isActive && "scale-110"
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  {item.showBadge && cartCount > 0 && (
                    <span
                      key={cartCount}
                      className="absolute -top-1.5 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground px-1 animate-scale-bounce"
                    >
                      {cartCount}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "text-[10px] transition-all duration-200",
                    isActive ? "font-semibold" : "font-medium"
                  )}
                >
                  {item.label}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
