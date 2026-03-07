import { taggedSql } from "@/lib/db";

export interface AnalyticsOverview {
  totalSearches: number;
  totalProductViews: number;
  totalCompareViews: number;
  searchesToday: number;
  viewsToday: number;
}

export interface TrendingSearch {
  query: string;
  count: number;
}

export interface PopularProduct {
  productId: number;
  name: string;
  slug: string;
  views: number;
}

export interface DailyStat {
  date: string;
  searches: number;
  productViews: number;
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const rows = await taggedSql`
    SELECT
      COUNT(*) FILTER (WHERE type = 'search') AS total_searches,
      COUNT(*) FILTER (WHERE type = 'product_view') AS total_product_views,
      COUNT(*) FILTER (WHERE type = 'compare_view') AS total_compare_views,
      COUNT(*) FILTER (WHERE type = 'search' AND created_at >= CURRENT_DATE) AS searches_today,
      COUNT(*) FILTER (WHERE type = 'product_view' AND created_at >= CURRENT_DATE) AS views_today
    FROM analytics_events
  `;
  const r = (rows as any[])[0];
  return {
    totalSearches: Number(r?.total_searches ?? 0),
    totalProductViews: Number(r?.total_product_views ?? 0),
    totalCompareViews: Number(r?.total_compare_views ?? 0),
    searchesToday: Number(r?.searches_today ?? 0),
    viewsToday: Number(r?.views_today ?? 0),
  };
}

export async function getTrendingSearches(days = 7, limit = 20): Promise<TrendingSearch[]> {
  const rows = await taggedSql`
    SELECT data AS query, COUNT(*) AS count
    FROM analytics_events
    WHERE type = 'search'
      AND data IS NOT NULL
      AND data != ''
      AND created_at >= NOW() - MAKE_INTERVAL(days => ${days})
    GROUP BY data
    ORDER BY count DESC
    LIMIT ${limit}
  `;
  return (rows as any[]).map((r) => ({
    query: r.query,
    count: Number(r.count),
  }));
}

export async function getPopularProducts(days = 7, limit = 20): Promise<PopularProduct[]> {
  const rows = await taggedSql`
    SELECT
      ae.product_id,
      p.canonical_name AS name,
      COUNT(*) AS views
    FROM analytics_events ae
    JOIN products p ON p.id = ae.product_id
    WHERE ae.type = 'product_view'
      AND ae.product_id IS NOT NULL
      AND ae.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
    GROUP BY ae.product_id, p.canonical_name
    ORDER BY views DESC
    LIMIT ${limit}
  `;
  return (rows as any[]).map((r) => ({
    productId: Number(r.product_id),
    name: r.name,
    slug: "", // filled in by caller with productToSlug
    views: Number(r.views),
  }));
}

export async function getDailyStats(days = 30): Promise<DailyStat[]> {
  const rows = await taggedSql`
    SELECT
      TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
      COUNT(*) FILTER (WHERE type = 'search') AS searches,
      COUNT(*) FILTER (WHERE type = 'product_view') AS product_views
    FROM analytics_events
    WHERE created_at >= NOW() - MAKE_INTERVAL(days => ${days})
    GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
    ORDER BY date ASC
  `;
  return (rows as any[]).map((r) => ({
    date: r.date,
    searches: Number(r.searches),
    productViews: Number(r.product_views),
  }));
}

export async function getRecentSearches(limit = 10): Promise<{ query: string; resultCount: number; ago: string }[]> {
  const rows = await taggedSql`
    SELECT data AS query, result_count, created_at
    FROM analytics_events
    WHERE type = 'search'
      AND data IS NOT NULL
      AND data != ''
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return (rows as any[]).map((r) => ({
    query: r.query,
    resultCount: Number(r.result_count ?? 0),
    ago: timeAgo(new Date(r.created_at)),
  }));
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
