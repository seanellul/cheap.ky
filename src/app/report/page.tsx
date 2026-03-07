"use client";

import { useState, useEffect } from "react";
import { TrendingDown, Trophy, BarChart3, ArrowRight, Percent, DollarSign, Package, Scale } from "lucide-react";
import { StoreBadge } from "@/components/store-badge";
import { formatKYD } from "@/lib/utils/currency";
import { trackReportView } from "@/lib/analytics";

interface ReportData {
  overview: {
    total_compared: number;
    avg_fosters: number;
    avg_hurleys: number;
    avg_costuless: number;
    avg_pricedright: number;
    avg_shopright: number;
    avg_savings: number;
    avg_pct_diff: number;
    total_potential_savings: number;
    over_20pct: number;
    over_50pct: number;
  };
  winRates: {
    fosters: number;
    hurleys: number;
    costuless: number;
    pricedright: number;
    shopright: number;
    total: number;
  };
  distribution: Array<{ bucket: string; count: number }>;
  categoryInsights: Array<{
    category: string;
    product_count: number;
    avg_pct_diff: number;
    avg_savings_per_item: number;
    total_savings: number;
  }>;
  biggestGaps: Array<{
    id: number;
    name: string;
    size: string | null;
    image_url: string | null;
    fosters_price: number | null;
    hurleys_price: number | null;
    costuless_price: number | null;
    pricedright_price: number | null;
    shopright_price: number | null;
    best_price: number;
    worst_price: number;
    savings: number;
    pct_diff: number;
    num_stores: number;
  }>;
  storeBests: Record<string, Array<{
    name: string;
    size: string | null;
    price: number;
    other_price: number;
    pct: number;
  }>>;
  headToHead: {
    total: number;
    fosters_cheaper: number;
    hurleys_cheaper: number;
    same_price: number;
    avg_fosters: number;
    avg_hurleys: number;
    total_diff: number;
  };
  storeCounts: Array<{ store_id: string; count: number }>;
  threeStoreProducts: Array<{
    id: number;
    name: string;
    size: string | null;
    fosters_price: number;
    hurleys_price: number;
    costuless_price: number;
    pricedright_price: number;
    shopright_price: number;
    best_price: number;
    worst_price: number;
    savings: number;
    pct_diff: number;
  }>;
  purchasingPower: Record<string, Record<string, number>>;
  allThreeBasket: {
    count: number;
    fosters: number;
    hurleys: number;
    costuless: number;
    pricedright: number;
    shopright: number;
  } | null;
}

const STORE_COLORS: Record<string, string> = {
  fosters: "bg-[#1B8E3D]",
  hurleys: "bg-[#E31837]",
  costuless: "bg-[#0066CC]",
  pricedright: "bg-[#7B2FBE]",
  shopright: "bg-[#2563EB]",
};

const STORE_COLORS_TEXT: Record<string, string> = {
  fosters: "text-[#1B8E3D]",
  hurleys: "text-[#E31837]",
  costuless: "text-[#0066CC]",
  pricedright: "text-[#7B2FBE]",
  shopright: "text-[#2563EB]",
};

const ALL_STORE_IDS = ["fosters", "hurleys", "costuless", "pricedright", "shopright"] as const;
const STORE_NAMES: Record<string, string> = {
  fosters: "Foster's",
  hurleys: "Hurley's",
  costuless: "Cost-U-Less",
  pricedright: "Priced Right",
  shopright: "Shopright",
};

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="border rounded-xl p-4 bg-card">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function BarSegment({ pct, color, label }: { pct: number; color: string; label: string }) {
  return (
    <div
      className={`${color} h-10 flex items-center justify-center text-white text-xs font-bold rounded-sm transition-all`}
      style={{ width: `${Math.max(pct, 3)}%` }}
      title={`${label}: ${pct.toFixed(1)}%`}
    >
      {pct >= 8 && `${pct.toFixed(0)}%`}
    </div>
  );
}

function getCheapestStoreId(item: Record<string, unknown>): string {
  const prices: [string, number][] = [];
  for (const s of ALL_STORE_IDS) {
    const p = item[`${s}_price`];
    if (typeof p === "number" && p > 0) prices.push([s, p]);
  }
  prices.sort((a, b) => a[1] - b[1]);
  return prices[0]?.[0] ?? "fosters";
}

export default function ReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/report")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); trackReportView(); });
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold sm:text-2xl">Market Report</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
          </div>
          {[1, 2, 3].map((i) => <div key={i} className="h-48 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  const { overview, winRates, distribution, categoryInsights, biggestGaps, storeBests, headToHead, storeCounts, threeStoreProducts, purchasingPower, allThreeBasket } = data;
  const totalDistribution = distribution.reduce((a, b) => a + b.count, 0);

  const distributionColors: Record<string, string> = {
    "50%+": "bg-red-500",
    "30-50%": "bg-orange-500",
    "20-30%": "bg-amber-500",
    "10-20%": "bg-yellow-500",
    "1-10%": "bg-emerald-400",
    "Same price": "bg-gray-300 dark:bg-gray-600",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">Grocery Market Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Analysis of {overview.total_compared.toLocaleString()} matched products across {storeCounts.length} stores
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Package}
          label="Products Compared"
          value={overview.total_compared.toLocaleString()}
          sub={`From ${storeCounts.map(s => s.count.toLocaleString()).join(" / ")} store products`}
        />
        <StatCard
          icon={DollarSign}
          label="Total Savings Available"
          value={formatKYD(overview.total_potential_savings)}
          sub="If always buying at cheapest store"
        />
        <StatCard
          icon={Percent}
          label="Avg Price Difference"
          value={`${overview.avg_pct_diff}%`}
          sub={`${formatKYD(overview.avg_savings)} per item on average`}
        />
        <StatCard
          icon={TrendingDown}
          label="Big Differences"
          value={overview.over_20pct.toLocaleString()}
          sub={`Products with >20% gap (${overview.over_50pct} over 50%)`}
        />
      </div>

      {/* Who Wins? */}
      <section className="border rounded-xl p-5 bg-card space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold">Which Store Has the Lowest Price?</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Across {winRates.total.toLocaleString()} identical products, here&apos;s how often each store offers the cheapest price:
        </p>
        <div className="flex gap-1 rounded-lg overflow-hidden">
          {ALL_STORE_IDS.map((id) => (
            <BarSegment key={id} pct={(winRates[id] ?? 0) / winRates.total * 100} color={STORE_COLORS[id]} label={STORE_NAMES[id]} />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-center">
          {ALL_STORE_IDS.map((id) => {
            const wins = winRates[id] ?? 0;
            return (
              <div key={id} className="rounded-lg border p-3">
                <StoreBadge storeId={id} />
                <div className={`text-2xl font-bold mt-1 ${STORE_COLORS_TEXT[id]}`}>
                  {(wins / winRates.total * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {wins.toLocaleString()} products
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Head to Head: Foster's vs Hurley's */}
      <section className="border rounded-xl p-5 bg-card space-y-4">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Head-to-Head: Foster&apos;s vs Hurley&apos;s</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          The two largest stores share {Number(headToHead.total).toLocaleString()} identical products.
        </p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg border p-3 bg-[#1B8E3D]/5">
            <StoreBadge storeId="fosters" />
            <div className="text-2xl font-bold text-[#1B8E3D] mt-1">
              {Number(headToHead.fosters_cheaper).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">cheaper</div>
            <div className="text-xs text-muted-foreground">avg {formatKYD(headToHead.avg_fosters)}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground uppercase font-medium mt-1">Same Price</div>
            <div className="text-2xl font-bold mt-1">
              {Number(headToHead.same_price).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">products</div>
          </div>
          <div className="rounded-lg border p-3 bg-[#E31837]/5">
            <StoreBadge storeId="hurleys" />
            <div className="text-2xl font-bold text-[#E31837] mt-1">
              {Number(headToHead.hurleys_cheaper).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">cheaper</div>
            <div className="text-xs text-muted-foreground">avg {formatKYD(headToHead.avg_hurleys)}</div>
          </div>
        </div>
      </section>

      {/* Purchasing Power: What Does $100 Get You? */}
      <section className="border rounded-xl p-5 bg-card space-y-5">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">What Does $100 Get You?</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          If you buy the same products at each store, here&apos;s how far your dollar stretches.
          Based on {allThreeBasket ? allThreeBasket.count.toLocaleString() + ` products available at all ${ALL_STORE_IDS.length} stores` : "matched product prices"}.
        </p>

        {/* The $100 visual comparison */}
        {allThreeBasket && (() => {
          const stores = ALL_STORE_IDS
            .filter(id => allThreeBasket[id] != null && allThreeBasket[id] > 0)
            .map(id => ({ id, name: STORE_NAMES[id], total: allThreeBasket[id] as number }))
            .sort((a, b) => a.total - b.total);

          const cheapest = stores[0];
          const baseAmount = 100;

          return (
            <div className="space-y-6">
              {/* Big visual: normalized to cheapest = $100 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {stores.map((store) => {
                  const equivalent = baseAmount * store.total / cheapest.total;
                  const isCheapest = store.id === cheapest.id;
                  const extra = equivalent - baseAmount;

                  return (
                    <div
                      key={store.id}
                      className={`relative rounded-xl border-2 p-5 text-center transition-all ${
                        isCheapest
                          ? "border-savings bg-savings/5"
                          : "border-border"
                      }`}
                    >
                      {isCheapest && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-savings text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                          Best Value
                        </div>
                      )}
                      <StoreBadge storeId={store.id} />
                      <div className={`text-4xl font-bold mt-3 tabular-nums ${isCheapest ? "text-savings" : STORE_COLORS_TEXT[store.id]}`}>
                        {formatKYD(equivalent)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {isCheapest
                          ? "for the same basket"
                          : <>costs <span className="font-semibold text-destructive">{formatKYD(extra)} more</span></>
                        }
                      </div>
                      {!isCheapest && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          ({((extra / baseAmount) * 100).toFixed(1)}% more expensive)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Cross-store conversion table */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Store-to-Store Conversion</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  &quot;If I spend $100 at Store A, the same products would cost me X at Store B&quot;
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="py-2 px-3 text-left font-medium">$100 spent at...</th>
                        {ALL_STORE_IDS.map(id => (
                          <th key={id} className="py-2 px-3 text-center font-medium"><StoreBadge storeId={id} /></th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ALL_STORE_IDS.map((fromStore) => (
                        <tr key={fromStore} className="border-b hover:bg-muted/50">
                          <td className="py-2.5 px-3 font-medium">
                            <StoreBadge storeId={fromStore} />
                          </td>
                          {ALL_STORE_IDS.map((toStore) => {
                            const val = purchasingPower[fromStore]?.[toStore];
                            const isSame = fromStore === toStore;
                            const isCheaper = val != null && val < 100;
                            const isMore = val != null && val > 100;
                            return (
                              <td key={toStore} className="py-2.5 px-3 text-center tabular-nums">
                                {isSame ? (
                                  <span className="text-muted-foreground">$100.00</span>
                                ) : val != null ? (
                                  <span className={isCheaper ? "font-bold text-savings" : isMore ? "text-destructive font-medium" : ""}>
                                    {formatKYD(val)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">--</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Read across: &quot;$100 at Store A buys the same products that would cost $X at Store B.&quot;
                  Green = you save money, red = you pay more.
                </p>
              </div>
            </div>
          );
        })()}
      </section>

      {/* Price Difference Distribution */}
      <section className="border rounded-xl p-5 bg-card space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Price Difference Distribution</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          How big is the price gap between the cheapest and most expensive store for the same product?
        </p>
        <div className="space-y-2">
          {distribution.map((d) => {
            const pct = d.count / totalDistribution * 100;
            return (
              <div key={d.bucket} className="flex items-center gap-3">
                <div className="w-24 text-sm font-medium text-right tabular-nums">{d.bucket}</div>
                <div className="flex-1 bg-muted rounded-full h-7 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${distributionColors[d.bucket] || "bg-gray-400"} flex items-center pl-2.5 transition-all`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  >
                    {pct > 8 && <span className="text-xs font-bold text-white">{d.count.toLocaleString()}</span>}
                  </div>
                </div>
                <div className="w-16 text-xs text-muted-foreground tabular-nums text-right">
                  {pct.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Biggest Price Gaps */}
      <section className="border rounded-xl p-5 bg-card space-y-4">
        <h2 className="text-lg font-bold">Biggest Price Gaps</h2>
        <p className="text-sm text-muted-foreground">
          The same product — wildly different prices depending on where you shop.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="py-2 px-3 text-left font-medium">Product</th>
                {ALL_STORE_IDS.map(id => (
                  <th key={id} className="py-2 px-2 text-center font-medium"><StoreBadge storeId={id} /></th>
                ))}
                <th className="py-2 px-2 text-right font-medium">Gap</th>
              </tr>
            </thead>
            <tbody>
              {biggestGaps.map((item) => {
                const cheapest = getCheapestStoreId(item);
                return (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="py-2.5 px-3">
                      <div className="font-medium truncate max-w-[250px]">{item.name}</div>
                      {item.size && <div className="text-xs text-muted-foreground">{item.size}</div>}
                    </td>
                    {ALL_STORE_IDS.map((s) => {
                      const price = (item as Record<string, unknown>)[`${s}_price`] as number | null;
                      const isCheapest = s === cheapest;
                      return (
                        <td key={s} className="py-2.5 px-2 text-center tabular-nums">
                          {price != null ? (
                            <span className={isCheapest ? "font-bold text-savings" : ""}>
                              {formatKYD(price)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-2 text-right">
                      <span className="font-bold text-destructive tabular-nums">{formatKYD(item.savings)}</span>
                      <div className="text-[10px] text-muted-foreground">{item.pct_diff}% diff</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Products at All 3 Stores */}
      {threeStoreProducts.length > 0 && (
        <section className="border rounded-xl p-5 bg-card space-y-4">
          <h2 className="text-lg font-bold">Available at All {ALL_STORE_IDS.length} Stores</h2>
          <p className="text-sm text-muted-foreground">
            {threeStoreProducts.length > 0 ? "These products are sold at every store — the perfect comparison." : ""}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="py-2 px-3 text-left font-medium">Product</th>
                  {ALL_STORE_IDS.map(id => (
                    <th key={id} className="py-2 px-2 text-center font-medium"><StoreBadge storeId={id} /></th>
                  ))}
                  <th className="py-2 px-2 text-right font-medium">Gap</th>
                </tr>
              </thead>
              <tbody>
                {threeStoreProducts.map((item) => {
                  const cheapest = getCheapestStoreId(item);
                  return (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="py-2.5 px-3">
                        <div className="font-medium truncate max-w-[250px]">{item.name}</div>
                        {item.size && <div className="text-xs text-muted-foreground">{item.size}</div>}
                      </td>
                      {ALL_STORE_IDS.map((s) => {
                        const price = (item as Record<string, unknown>)[`${s}_price`] as number;
                        const isCheapest = s === cheapest;
                        return (
                          <td key={s} className="py-2.5 px-2 text-center tabular-nums">
                            <span className={isCheapest ? "font-bold text-savings" : ""}>
                              {formatKYD(price)}
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-2 text-right">
                        <span className="font-bold text-destructive tabular-nums">{formatKYD(item.savings)}</span>
                        <div className="text-[10px] text-muted-foreground">{item.pct_diff}% diff</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Category Insights */}
      <section className="border rounded-xl p-5 bg-card space-y-4">
        <h2 className="text-lg font-bold">Categories With Biggest Price Gaps</h2>
        <p className="text-sm text-muted-foreground">
          Some product categories have much bigger cross-store price differences than others.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="py-2 px-3 text-left font-medium">Category</th>
                <th className="py-2 px-2 text-center font-medium">Products</th>
                <th className="py-2 px-2 text-center font-medium">Avg Gap</th>
                <th className="py-2 px-2 text-right font-medium">Avg Savings</th>
                <th className="py-2 px-2 text-right font-medium">Total Savings</th>
              </tr>
            </thead>
            <tbody>
              {categoryInsights.map((cat) => (
                <tr key={cat.category} className="border-b hover:bg-muted/50">
                  <td className="py-2.5 px-3 font-medium">{cat.category}</td>
                  <td className="py-2.5 px-2 text-center tabular-nums">{cat.product_count}</td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      cat.avg_pct_diff >= 25 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : cat.avg_pct_diff >= 15 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}>
                      {cat.avg_pct_diff}%
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">{formatKYD(cat.avg_savings_per_item)}</td>
                  <td className="py-2.5 px-2 text-right font-medium tabular-nums">{formatKYD(cat.total_savings)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Where Each Store Shines */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold">Where Each Store Shines</h2>
        <p className="text-sm text-muted-foreground">
          Products where each store significantly undercuts the competition.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {ALL_STORE_IDS.map((storeId) => (
            <div key={storeId} className="border rounded-xl p-4 bg-card space-y-3">
              <StoreBadge storeId={storeId} />
              <div className="space-y-2">
                {storeBests[storeId]?.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate flex-1">{item.name}</span>
                    <div className="text-right flex-shrink-0">
                      <span className="font-bold text-savings">{formatKYD(item.price)}</span>
                      <span className="text-muted-foreground text-xs ml-1">vs {formatKYD(item.other_price)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Methodology */}
      <section className="border rounded-xl p-5 bg-muted/30 space-y-2">
        <h2 className="text-sm font-bold">Methodology</h2>
        <p className="text-xs text-muted-foreground">
          This report compares {overview.total_compared.toLocaleString()} products matched across
          {" "}{storeCounts.length} Cayman Islands grocery stores using UPC barcodes and fuzzy name matching.
          Products with price ratios over 5x are excluded as likely data errors.
          Prices reflect the most recent store data ingestion. Sale prices are used when available.
        </p>
        <p className="text-xs text-muted-foreground">
          Store catalogues: {storeCounts.map(s => `${STORE_NAMES[s.store_id] ?? s.store_id} (${s.count.toLocaleString()} products)`).join(", ")}.
        </p>
      </section>
    </div>
  );
}
