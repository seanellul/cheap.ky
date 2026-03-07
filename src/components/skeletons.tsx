import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function SearchResultSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border bg-card p-4">
          <Bone className="h-14 w-14 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-3/4" />
            <Bone className="h-3 w-1/3" />
          </div>
          <div className="hidden md:flex gap-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <Bone key={j} className="h-6 w-16" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CartItemSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border bg-card p-4">
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-1/2" />
            <Bone className="h-3 w-1/4" />
          </div>
          <Bone className="h-8 w-24" />
          <div className="hidden md:flex gap-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <Bone key={j} className="h-6 w-16" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
