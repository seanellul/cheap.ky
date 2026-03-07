import type { StoreAdapter, RawProduct } from "../types";

export class KirkMarketAdapter implements StoreAdapter {
  storeId = "kirkmarket";

  async fetch(): Promise<RawProduct[]> {
    console.log("[kirkmarket] Kirk Market does not have an online grocery store.");
    console.log("[kirkmarket] Their website only offers catering platters for online ordering.");
    console.log("[kirkmarket] Skipping ingestion - 0 products.");
    return [];
  }
}
