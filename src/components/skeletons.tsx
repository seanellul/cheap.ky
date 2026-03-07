import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return <div className={cn("rounded-md skeleton-shimmer", className)} />;
}

export function SearchResultSkeleton() {
  return (
    <div className="space-y-2 stagger-children">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-2xl border bg-card p-3">
          <Bone className="h-16 w-16 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2.5 py-0.5">
            <Bone className="h-4 w-4/5 rounded" />
            <Bone className="h-3 w-2/5 rounded" />
            <div className="flex gap-1.5 pt-0.5">
              <Bone className="h-5 w-16 rounded-lg" />
              <Bone className="h-5 w-16 rounded-lg" />
              <Bone className="h-5 w-16 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CartItemSkeleton() {
  return (
    <div className="space-y-2 stagger-children">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-1/2 rounded" />
            <Bone className="h-3 w-1/4 rounded" />
          </div>
          <Bone className="h-8 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
