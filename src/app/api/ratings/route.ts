import { NextRequest, NextResponse } from "next/server";
import { rawSql } from "@/lib/db";
import { getRatingsForProduct } from "@/lib/data/products";

async function getFingerprint(request: NextRequest): Promise<string> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const ua = request.headers.get("user-agent") ?? "unknown";
  const data = new TextEncoder().encode(ip + ua);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId");
  if (!productId || isNaN(Number(productId))) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const ratings = await getRatingsForProduct(Number(productId));
  return NextResponse.json(ratings);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { productId, storeId, rating } = body;

  if (!productId || !storeId || (rating !== 1 && rating !== -1)) {
    return NextResponse.json(
      { error: "productId, storeId, and rating (1 or -1) required" },
      { status: 400 }
    );
  }

  const fingerprint = await getFingerprint(request);

  // Rate limit: max 20 ratings per fingerprint per hour
  const [rateCheck] = await rawSql(
    `SELECT COUNT(*) as cnt FROM product_ratings
     WHERE fingerprint = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
    [fingerprint]
  );
  if (Number(rateCheck.cnt) >= 20) {
    return NextResponse.json(
      { error: "Too many ratings, try again later" },
      { status: 429 }
    );
  }

  // Upsert: insert or update existing vote
  await rawSql(
    `INSERT INTO product_ratings (product_id, store_id, rating, fingerprint)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (product_id, store_id, fingerprint)
     DO UPDATE SET rating = $3, created_at = NOW()`,
    [productId, storeId, rating, fingerprint]
  );

  const ratings = await getRatingsForProduct(Number(productId));
  return NextResponse.json(ratings);
}
