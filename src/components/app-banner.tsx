"use client";

import { useState, useEffect } from "react";
import { X, Smartphone } from "lucide-react";
import { BrandIcon } from "@/components/brand-logo";
import { trackAppBannerDismiss, trackAppRequest } from "@/lib/analytics";

const DISMISS_KEY = "app-banner-dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type BannerStep = "idle" | "pick-platform" | "confirmed";

export function AppBanner() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<BannerStep>("idle");

  useEffect(() => {
    if (window.innerWidth >= 768) return;

    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const ts = parseInt(dismissed, 10);
        if (Date.now() - ts < DISMISS_DURATION_MS) return;
      }
    } catch {}

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

  function handlePlatformPick(platform: "ios" | "android") {
    trackAppRequest(platform);
    setStep("confirmed");
    // Auto-dismiss after showing confirmation
    setTimeout(() => {
      setVisible(false);
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {}
    }, 2000);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-3 pb-2 md:hidden animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl border bg-card shadow-lg p-3 flex items-center gap-3">
        <BrandIcon className="h-10 w-10 shrink-0 rounded-xl" />

        {step === "idle" && (
          <>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm leading-tight">Cheap.ky</div>
              <div className="text-xs text-muted-foreground leading-tight mt-0.5">
                Scan barcodes & compare prices on the go
              </div>
            </div>
            <button
              onClick={() => setStep("pick-platform")}
              className="shrink-0 bg-primary text-primary-foreground text-xs font-semibold px-3.5 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5 active:scale-95"
            >
              <Smartphone className="h-3.5 w-3.5" />
              Get App
            </button>
          </>
        )}

        {step === "pick-platform" && (
          <>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm leading-tight">Which platform?</div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => handlePlatformPick("ios")}
                className="bg-foreground text-background text-xs font-semibold px-3 py-2 rounded-lg transition-all active:scale-95 flex items-center gap-1.5"
              >
                <svg viewBox="0 0 384 512" fill="currentColor" className="h-3.5 w-3.5"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184 4 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
                iOS
              </button>
              <button
                onClick={() => handlePlatformPick("android")}
                className="bg-foreground text-background text-xs font-semibold px-3 py-2 rounded-lg transition-all active:scale-95 flex items-center gap-1.5"
              >
                <svg viewBox="0 0 576 512" fill="currentColor" className="h-3.5 w-3.5"><path d="M420.55 301.93a24 24 0 1 1 24-24 24 24 0 0 1-24 24m-265.1 0a24 24 0 1 1 24-24 24 24 0 0 1-24 24m273.7-144.48l47.94-83a10 10 0 1 0-17.27-10l-48.54 84.07a306.2 306.2 0 0 0-134.59 0l-48.54-84.07a10 10 0 1 0-17.27 10l47.94 83C175.1 198.44 128 270 128 352h320c0-82-47.1-153.56-119.85-194.55"/></svg>
                Android
              </button>
            </div>
          </>
        )}

        {step === "confirmed" && (
          <div className="flex-1 min-w-0 animate-in fade-in duration-200">
            <div className="font-semibold text-sm leading-tight text-primary">App coming soon!</div>
            <div className="text-xs text-muted-foreground leading-tight mt-0.5">
              We&apos;ll let you know when it&apos;s ready
            </div>
          </div>
        )}

        {step !== "confirmed" && (
          <button
            onClick={dismiss}
            className="shrink-0 p-1 -mr-1 text-muted-foreground/60 hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
