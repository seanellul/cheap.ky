import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-slide-up-fade">
      <div className="relative rounded-2xl bg-muted/60 p-5 mb-4">
        <div className="absolute inset-0 rounded-2xl bg-primary/5 scale-150 blur-xl" />
        <div className="relative animate-float">
          <Icon className="h-8 w-8 text-muted-foreground/50" />
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">{description}</p>
      {actionLabel && actionHref && (
        <Button render={<Link href={actionHref} />} className="mt-5 rounded-xl h-10 px-5" variant="outline">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
