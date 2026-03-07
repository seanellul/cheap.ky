"use client";

import { usePathname } from "next/navigation";
import { Search, ShoppingCart, Settings, ListChecks, ArrowLeftRight, BarChart3, Sun, Moon, Monitor } from "lucide-react";
import { useCart } from "@/lib/contexts/cart-context";
import { useTheme } from "@/lib/contexts/theme-context";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", icon: Search, label: "Search" },
  { href: "/compare", icon: ArrowLeftRight, label: "Compare" },
  { href: "/report", icon: BarChart3, label: "Report" },
  { href: "/staples", icon: ListChecks, label: "Staples" },
  { href: "/cart", icon: ShoppingCart, label: "Cart", showBadge: true },
  { href: "/admin/ingest", icon: Settings, label: "Admin" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { cartCount } = useCart();
  const { theme, setTheme } = useTheme();

  function cycleTheme() {
    setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
  }

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-sm md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 px-4 min-h-[48px] min-w-[48px] transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span className="relative">
                <item.icon className="h-5 w-5" />
                {item.showBadge && cartCount > 0 && (
                  <span
                    key={cartCount}
                    className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground px-1 animate-in zoom-in-50 duration-200"
                  >
                    {cartCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </a>
          );
        })}
        <button
          onClick={cycleTheme}
          className="flex flex-col items-center justify-center gap-0.5 py-2 px-4 min-h-[48px] min-w-[48px] transition-colors text-muted-foreground"
          aria-label="Toggle theme"
        >
          <ThemeIcon className="h-5 w-5" />
          <span className="text-[10px] font-medium">Theme</span>
        </button>
      </div>
    </nav>
  );
}
