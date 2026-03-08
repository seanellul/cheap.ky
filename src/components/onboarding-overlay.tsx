"use client";

import { useState, useEffect, useCallback } from "react";
import { BrandIcon, BrandLogo } from "@/components/brand-logo";
import { Search, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  trackOnboardingStarted,
  trackOnboardingCompleted,
  trackOnboardingSkipped,
} from "@/lib/analytics";

const STORAGE_KEY = "cheapky-onboarding-done";

const steps = [
  {
    icon: "brand",
    title: "Find the best grocery prices in Cayman",
    subtitle: null,
  },
  {
    icon: "search",
    title: "Compare prices across every store",
    subtitle: "Search any product or browse everyday staples",
  },
  {
    icon: "cart",
    title: "See how much you save",
    subtitle: "Build a smart cart and find the cheapest store",
  },
] as const;

export function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    const timer = setTimeout(() => {
      setVisible(true);
      trackOnboardingStarted();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = useCallback(
    (completed: boolean) => {
      setExiting(true);
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {}
      if (completed) {
        trackOnboardingCompleted(3);
      } else {
        trackOnboardingSkipped(step);
      }
      setTimeout(() => setVisible(false), 200);
    },
    [step]
  );

  if (!visible) return null;

  const isLast = step === steps.length - 1;
  const current = steps[step];

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-background/95 backdrop-blur-sm transition-opacity duration-200 ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6 px-6 text-center max-w-sm">
        <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10">
          {current.icon === "brand" && <BrandIcon className="h-10 w-10" />}
          {current.icon === "search" && (
            <Search className="h-8 w-8 text-primary" />
          )}
          {current.icon === "cart" && (
            <ShoppingCart className="h-8 w-8 text-primary" />
          )}
        </div>

        {step === 0 && <BrandLogo size="lg" />}

        <h2 className="text-xl font-bold tracking-tight">{current.title}</h2>

        {current.subtitle && (
          <p className="text-muted-foreground text-sm">{current.subtitle}</p>
        )}

        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3 w-full">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => dismiss(false)}
          >
            Skip
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              if (isLast) {
                dismiss(true);
              } else {
                setStep(step + 1);
              }
            }}
          >
            {isLast ? "Get Started" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
