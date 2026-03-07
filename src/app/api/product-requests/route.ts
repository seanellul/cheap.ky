import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productRequests } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { productName } = await req.json();

  const trimmed = (productName ?? "").trim();
  if (!trimmed || trimmed.length > 200) {
    return NextResponse.json(
      { error: "Product name is required and must be 200 characters or less" },
      { status: 400 }
    );
  }

  const userAgent = req.headers.get("user-agent") || null;

  await db.insert(productRequests).values({
    productName: trimmed,
    userAgent,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");

  const rows = await db
    .select()
    .from(productRequests)
    .where(status ? eq(productRequests.status, status) : undefined)
    .orderBy(desc(productRequests.createdAt))
    .limit(500);

  return NextResponse.json({ requests: rows });
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json();

  if (!["pending", "noted", "added"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await db
    .update(productRequests)
    .set({ status })
    .where(eq(productRequests.id, id));

  return NextResponse.json({ ok: true });
}
