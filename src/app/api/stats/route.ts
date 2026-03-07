import { NextResponse } from "next/server";
import { rawSql } from "@/lib/db";

let cache: { data: unknown; ts: number } | null = null;
const CACHE_MS = 60 * 60 * 1000; // 1 hour

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return NextResponse.json(cache.data);
  }

  const [productRow, storeRow, matchRow] = await Promise.all([
    rawSql("SELECT COUNT(*) AS count FROM products"),
    rawSql("SELECT COUNT(*) AS count FROM stores WHERE active = true"),
    rawSql("SELECT COUNT(*) AS count FROM product_matches"),
  ]);

  const data = {
    products: Number(productRow[0]?.count ?? 0),
    stores: Number(storeRow[0]?.count ?? 0),
    matches: Number(matchRow[0]?.count ?? 0),
  };

  cache = { data, ts: Date.now() };
  return NextResponse.json(data);
}
