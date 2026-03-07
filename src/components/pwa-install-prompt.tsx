"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Download, Share } from "lucide-react";
import { BrandIcon } from "@/components/brand-logo";
import {
  trackPWAPromptShown,
  trackPWAInstall,
  trackPWAPromptDismissed,
} from "@/lib/analytics";

const VISITS_KEY = "cheapky-visits";
const DISMISSED_KEY = "cheapky-pwa-dismissed";
const INSTALLED_KEY = "cheapky-pwa-installed";
const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  const shouldShow = useCallback((): boolean => {
    // Desktop — skip
    if (window.innerWidth >= 768) return false;

    // Already in standalone mode
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as Record<string, unknown>).standalone)
    )
      return false;

    try {
      // Already installed
      if (localStorage.getItem(INSTALLED_KEY)) return false;

      // Recently dismissed
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (dismissed) {
        if (Date.now() - parseInt(dismissed, 10) < DISMISS_DURATION_MS)
          return false;
      }

      // Check visit count
      const visits = parseInt(localStorage.getItem(VISITS_KEY) || "0", 10) + 1;
      localStorage.setItem(VISITS_KEY, String(visits));
      return visits >= 2;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    // Detect iOS
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
    setIsIOS(ios);

    if (!shouldShow()) return;

    // For iOS, show after a delay
    if (ios) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
        trackPWAPromptShown("ios-manual");
      }, 1500);
      return () => clearTimeout(timer);
    }

    // For Android/Chrome — listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
      trackPWAPromptShown("beforeinstallprompt");
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [shouldShow]);

  // Listen for cart-updated events as an additional trigger
  useEffect(() => {
    const handler = () => {
      if (!showPrompt && shouldShow()) {
        setShowPrompt(true);
        trackPWAPromptShown("cart-updated");
      }
    };
    window.addEventListener("cart-updated", handler);
    return () => window.removeEventListener("cart-updated", handler);
  }, [showPrompt, shouldShow]);

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        trackPWAInstall("android");
        try {
          localStorage.setItem(INSTALLED_KEY, "true");
        } catch {}
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  }

  function dismiss() {
    trackPWAPromptDismissed();
    setShowPrompt(false);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {}
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom))] left-0 right-0 z-50 px-3 pb-2 md:hidden animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl border bg-card shadow-lg p-3">
        <div className="flex items-center gap-3">
          <BrandIcon className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm leading-tight">
              Add Cheap.ky to Home Screen
            </div>
            <div className="text-xs text-muted-foreground leading-tight mt-0.5">
              {isIOS
                ? "Get quick access — like an app, no download needed"
                : "Shop smarter with instant access from your home screen"}
            </div>
          </div>
          <button
            onClick={dismiss}
            className="shrink-0 p-1 -mr-1 text-muted-foreground/60 hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="mt-2.5 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <Share className="h-4 w-4 shrink-0 text-primary" />
            <span>
              Tap <strong>Share</strong> then{" "}
              <strong>Add to Home Screen</strong>
            </span>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            className="mt-2.5 w-full bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Download className="h-4 w-4" />
            Install App
          </button>
        )}
      </div>
    </div>
  );
}
