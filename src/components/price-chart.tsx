"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { STORE_NAMES } from "./price-comparison-row";

const STORE_COLORS: Record<string, string> = {
  fosters: "#2563eb",
  hurleys: "#dc2626",
  kirkmarket: "#16a34a",
  costuless: "#9333ea",
  pricedright: "#f97316",
};

interface PricePoint {
  date: string;
  [storeId: string]: number | string | null;
}

interface PriceChartProps {
  data: PricePoint[];
  storeIds: string[];
}

export function PriceChart({ data, storeIds }: PriceChartProps) {
  if (data.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        No price history data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" fontSize={12} />
        <YAxis
          fontSize={12}
          tickFormatter={(v) => `$${v.toFixed(2)}`}
        />
        <Tooltip
          formatter={(value) => [`$${Number(value).toFixed(2)}`, ""]}
        />
        <Legend />
        {storeIds.map((storeId) => (
          <Line
            key={storeId}
            type="monotone"
            dataKey={storeId}
            name={STORE_NAMES[storeId] || storeId}
            stroke={STORE_COLORS[storeId] || "#666"}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
