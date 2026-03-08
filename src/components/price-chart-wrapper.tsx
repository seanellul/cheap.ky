"use client";

import dynamic from "next/dynamic";

const PriceChart = dynamic(
  () => import("@/components/price-chart").then((m) => m.PriceChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] animate-pulse bg-muted rounded-xl" />
    ),
  }
);

interface PriceChartWrapperProps {
  data: Array<{ date: string; [storeId: string]: number | string | null }>;
  storeIds: string[];
}

export function PriceChartWrapper({ data, storeIds }: PriceChartWrapperProps) {
  return <PriceChart data={data} storeIds={storeIds} />;
}
