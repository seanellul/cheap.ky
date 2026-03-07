export interface RawProduct {
  sku: string;
  upc?: string | null;
  name: string;
  brand?: string | null;
  description?: string | null;
  price?: number | null;
  salePrice?: number | null;
  unit?: string | null;
  size?: string | null;
  categoryRaw?: string | null;
  imageUrl?: string | null;
  inStock?: boolean;
  sourceUrl?: string | null;
  rawData?: Record<string, unknown>;
}

export interface StoreAdapter {
  storeId: string;
  fetch(): Promise<RawProduct[]>;
}
