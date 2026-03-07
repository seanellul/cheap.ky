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
      <div className="rounded-2xl bg-muted/60 p-5 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">{description}</p>
      {actionLabel && actionHref && (
        <Button render={<a href={actionHref} />} className="mt-5 rounded-xl h-10 px-5" variant="outline">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
