"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "@/lib/contexts/theme-context";

export function Toaster() {
  const { theme } = useTheme();
  return (
    <SonnerToaster
      position="bottom-right"
      theme={theme === "system" ? undefined : theme}
      toastOptions={{
        classNames: {
          toast: "bg-card border-border text-card-foreground shadow-lg rounded-xl",
          title: "text-sm font-medium",
          description: "text-xs text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground text-xs rounded-lg",
        },
      }}
    />
  );
}
