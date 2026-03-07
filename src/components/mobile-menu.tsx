"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Search,
  ArrowLeftRight,
  ListChecks,
  ShoppingCart,
  Heart,
  History,
  BarChart3,
  BookOpen,
  Compass,
  Activity,
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
      { href: "/favourites", icon: Heart, label: "Favourites" },
      { href: "/cart", icon: ShoppingCart, label: "My Cart" },
      { href: "/history", icon: History, label: "Shopping History" },
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
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on escape
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  }, []);
  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [open, handleKey]);

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

      {/* Portal to body so drawer escapes header's stacking context */}
      {open && createPortal(
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute top-0 right-0 h-full w-72 max-w-[85vw] bg-card border-l shadow-2xl animate-in slide-in-from-right duration-250">
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
            <div className="overflow-y-auto h-[calc(100%-56px)] py-2 overscroll-contain">
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
        </div>,
        document.body
      )}
    </>
  );
}
