"use client";

import { useState, useEffect } from "react";
import { X, Smartphone } from "lucide-react";
import { BrandIcon } from "@/components/brand-logo";
import { trackAppBannerClick, trackAppBannerDismiss } from "@/lib/analytics";

const APP_STORE_URL = "https://apps.apple.com/app/cheapky"; // TODO: replace with real URL
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=ky.cheap.app"; // TODO: replace with real URL
const DISMISS_KEY = "app-banner-dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getStoreUrl() {
  if (typeof navigator === "undefined") return APP_STORE_URL;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return APP_STORE_URL;
  return PLAY_STORE_URL;
}

export function AppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show on mobile-sized screens
    if (window.innerWidth >= 768) return;

    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const ts = parseInt(dismissed, 10);
        if (Date.now() - ts < DISMISS_DURATION_MS) return;
      }
    } catch {}

    // Small delay so it doesn't flash on load
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    trackAppBannerDismiss();
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-3 pb-2 md:hidden animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl border bg-card shadow-lg p-3 flex items-center gap-3">
        <BrandIcon className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm leading-tight">Cheap.ky</div>
          <div className="text-xs text-muted-foreground leading-tight mt-0.5">
            Scan barcodes & compare prices on the go
          </div>
        </div>
        <a
          href={getStoreUrl()}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackAppBannerClick(/iPad|iPhone|iPod/.test(navigator.userAgent) ? "ios" : "android")}
          className="shrink-0 bg-primary text-primary-foreground text-xs font-semibold px-3.5 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5"
        >
          <Smartphone className="h-3.5 w-3.5" />
          Get App
        </a>
        <button
          onClick={dismiss}
          className="shrink-0 p-1 -mr-1 text-muted-foreground/60 hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
