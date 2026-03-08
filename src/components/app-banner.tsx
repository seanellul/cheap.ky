"use client";

import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { BrandIcon } from "@/components/brand-logo";
import { trackAppBannerDismiss } from "@/lib/analytics";

const DISMISS_KEY = "app-banner-dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function AppBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Hide in standalone mode
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as Record<string, unknown>).standalone)
    )
      return;

    if (window.innerWidth >= 768) return;

    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const ts = parseInt(dismissed, 10);
        if (Date.now() - ts < DISMISS_DURATION_MS) return;
      }
    } catch {}

    const timer = setTimeout(() => setVisible(true), 800);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  function dismiss() {
    trackAppBannerDismiss();
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        try {
          localStorage.setItem("cheapky-pwa-installed", "true");
        } catch {}
      }
      setDeferredPrompt(null);
      setVisible(false);
    } else {
      // iOS or no prompt available — scroll to PWA install prompt or just dismiss
      dismiss();
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-3 pb-2 md:hidden animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl border bg-card shadow-lg p-3 flex items-center gap-3">
        <BrandIcon className="h-10 w-10 shrink-0 rounded-xl" />

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm leading-tight">Cheap.ky</div>
          <div className="text-xs text-muted-foreground leading-tight mt-0.5">
            Add to your home screen for quick access
          </div>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 bg-primary text-primary-foreground text-xs font-semibold px-3.5 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5 active:scale-95"
        >
          <Download className="h-3.5 w-3.5" />
          Install
        </button>

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
