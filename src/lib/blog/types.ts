export interface BlogArticle {
  slug: string;
  title: string;
  description: string;
  content: string; // HTML
  category: string;
  tags: string[];
}

// Data shapes passed into templates

export interface PriceGap {
  productName: string;
  productSlug: string;
  cheapestStore: string;
  cheapestPrice: number;
  expensiveStore: string;
  expensivePrice: number;
  savings: number;
  pctDiff: number;
}

export interface StoreSummary {
  storeId: string;
  storeName: string;
  totalProducts: number;
  matchedProducts: number;
  winRate: number;
  avgPrice: number;
}

export interface CategoryBreakdown {
  category: string;
  categorySlug: string;
  productCount: number;
  cheapestStore: string;
  avgSavings: number;
}

export interface PriceDrop {
  productName: string;
  productSlug: string;
  storeName: string;
  oldPrice: number;
  newPrice: number;
  dropAmount: number;
  dropPct: number;
}

export interface WeeklyReportData {
  weekOf: string; // e.g. "March 3, 2026"
  totalProducts: number;
  totalMatched: number;
  topGaps: PriceGap[];
  storeSummaries: StoreSummary[];
  priceDrops: PriceDrop[];
  categoryBreakdowns: CategoryBreakdown[];
}

export interface StoreComparisonData {
  storeA: StoreSummary;
  storeB: StoreSummary;
  storeAWins: PriceGap[]; // products where A is cheaper
  storeBWins: PriceGap[]; // products where B is cheaper
  totalCompared: number;
}

export interface CategorySpotlightData {
  category: string;
  categorySlug: string;
  productCount: number;
  storeSummaries: { storeName: string; avgPrice: number; productCount: number }[];
  topGaps: PriceGap[];
  cheapestStore: string;
}
