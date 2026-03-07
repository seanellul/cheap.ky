"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Search,
  ArrowLeftRight,
  ListChecks,
  ShoppingCart,
  BarChart3,
  BookOpen,
  Compass,
  Activity,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const MENU_SECTIONS = [
  {
    label: "Shop",
    items: [
      { href: "/", icon: Search, label: "Search" },
      { href: "/compare", icon: ArrowLeftRight, label: "Compare Prices" },
      { href: "/staples", icon: ListChecks, label: "Everyday Staples" },
      { href: "/cart", icon: ShoppingCart, label: "My Cart" },
    ],
  },
  {
    label: "Discover",
    items: [
      { href: "/blog", icon: BookOpen, label: "Blog" },
      { href: "/guides/grocery-prices-cayman-islands-2026", icon: Compass, label: "Guides" },
      { href: "/report", icon: BarChart3, label: "Price Report" },
      { href: "/analytics", icon: Activity, label: "Analytics" },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/admin/ingest", icon: Settings, label: "Admin" },
    ],
  },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="md:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-72 bg-card border-l shadow-2xl md:hidden",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <BrandLogo size="sm" showIcon />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Nav sections */}
        <div className="overflow-y-auto h-[calc(100%-56px)] py-2">
          {MENU_SECTIONS.map((section) => (
            <div key={section.label} className="px-3 py-2">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-1">
                {section.label}
              </div>
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/80 active:bg-muted"
                    )}
                  >
                    <item.icon className={cn("h-4.5 w-4.5", active ? "text-primary" : "text-muted-foreground")} />
                    {item.label}
                  </a>
                );
              })}
            </div>
          ))}

          {/* Theme toggle at bottom */}
          <div className="px-6 py-4 mt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
