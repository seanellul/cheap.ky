"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProductRequest {
  id: number;
  productName: string;
  userAgent: string | null;
  status: string;
  createdAt: string;
}

const STATUS_CYCLE = ["pending", "noted", "added"] as const;

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  pending: "outline",
  noted: "secondary",
  added: "default",
};

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ProductRequestsPage() {
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const params = filter ? "?status=" + filter : "";
    const res = await fetch("/api/product-requests" + params);
    const data = await res.json();
    setRequests(data.requests || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function cycleStatus(req: ProductRequest) {
    const currentIdx = STATUS_CYCLE.indexOf(req.status as typeof STATUS_CYCLE[number]);
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];

    await fetch("/api/product-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: req.id, status: nextStatus }),
    });

    setRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: nextStatus } : r))
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Product Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Products users are looking for ({requests.length} total)
          </p>
        </div>
        <a href="/admin/ingest">
          <Button variant="outline" size="sm">
            Ingestion
          </Button>
        </a>
      </div>

      <div className="flex gap-1.5">
        {["", "pending", "noted", "added"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={"text-xs px-2.5 py-1 rounded-full border transition-colors " + (
              filter === s
                ? "bg-primary text-primary-foreground border-primary"
                : "hover:bg-muted"
            )}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No requests yet.
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="py-2.5 px-3 text-left text-sm font-medium">Product Name</th>
                <th className="py-2.5 px-3 text-left text-sm font-medium">Status</th>
                <th className="py-2.5 px-3 text-left text-sm font-medium hidden sm:table-cell">Submitted</th>
                <th className="py-2.5 px-3 text-left text-sm font-medium hidden md:table-cell">User Agent</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-3 text-sm font-medium">{req.productName}</td>
                  <td className="py-3 px-3">
                    <Badge
                      variant={STATUS_VARIANT[req.status] || "outline"}
                      className="cursor-pointer select-none"
                      onClick={() => cycleStatus(req)}
                    >
                      {req.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-sm text-muted-foreground hidden sm:table-cell">
                    {timeAgo(req.createdAt)}
                  </td>
                  <td className="py-3 px-3 text-xs text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                    {req.userAgent || "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
