"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StoreInfo {
  id: string;
  name: string;
  website: string;
  sourceType: string;
  lastIngestedAt: string | null;
  productCount: number;
}

export default function IngestPage() {
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const fetchStores = useCallback(async () => {
    const res = await fetch("/api/ingest");
    const data = await res.json();
    setStores(data.stores || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  async function handleIngest(storeId: string) {
    setIngesting(storeId);
    setLog((prev) => [...prev, `Starting ingestion for ${storeId}...`]);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, runMatching: true }),
      });
      const data = await res.json();

      if (data.ok) {
        setLog((prev) => [
          ...prev,
          `${storeId}: ${data.upserted} products, ${data.priceRecords} price records`,
        ]);
      } else {
        setLog((prev) => [...prev, `${storeId} error: ${data.error}`]);
      }
    } catch (e) {
      setLog((prev) => [...prev, `${storeId} failed: ${e}`]);
    } finally {
      setIngesting(null);
      fetchStores();
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ingestion Dashboard</h1>
        <div className="flex gap-2">
          <a href="/admin/requests">
            <Button variant="outline" size="sm">
              Product Requests
            </Button>
          </a>
          <a href="/admin/matches">
            <Button variant="outline" size="sm">
              Match Review
            </Button>
          </a>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {stores.map((store) => (
          <Card key={store.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{store.name}</CardTitle>
                <Badge variant="outline">{store.sourceType}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Products</span>
                  <span className="font-medium">{store.productCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Ingested</span>
                  <span className="font-medium">
                    {store.lastIngestedAt
                      ? new Date(store.lastIngestedAt).toLocaleString()
                      : "Never"}
                  </span>
                </div>
                <Button
                  className="w-full mt-2"
                  size="sm"
                  disabled={ingesting !== null}
                  onClick={() => handleIngest(store.id)}
                >
                  {ingesting === store.id ? "Ingesting..." : "Run Ingestion"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {log.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ingestion Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-xs space-y-1 max-h-60 overflow-y-auto">
              {log.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
