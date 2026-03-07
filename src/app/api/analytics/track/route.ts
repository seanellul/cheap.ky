import { NextResponse } from "next/server";
import { taggedSql } from "@/lib/db";

const VALID_TYPES = ["search", "product_view", "compare_view", "page_view"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data, productId, resultCount } = body;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    // Sanitize search queries: lowercase, trim, max 200 chars
    const sanitizedData = typeof data === "string"
      ? data.toLowerCase().trim().slice(0, 200)
      : null;

    await taggedSql`
      INSERT INTO analytics_events (type, data, product_id, result_count)
      VALUES (${type}, ${sanitizedData}, ${productId ?? null}, ${resultCount ?? null})
    `;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to track" }, { status: 500 });
  }
}
