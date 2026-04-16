import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { smartCartItems, staples, stapleProducts, storeProducts } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET() {
  const items = await db
    .select()
    .from(smartCartItems)
    .innerJoin(staples, eq(smartCartItems.stapleId, staples.id));

  if (items.length === 0) {
    return NextResponse.json({ items: [] });
  }

  // Single query for all staple-product links instead of N per-item queries
  const stapleIds = items.map((item) => item.staples.id);
  const allLinks = await db
    .select({
      stapleId: stapleProducts.stapleId,
      storeId: stapleProducts.storeId,
      productName: storeProducts.name,
      price: storeProducts.price,
      salePrice: storeProducts.salePrice,
      size: storeProducts.size,
      imageUrl: storeProducts.imageUrl,
    })
    .from(stapleProducts)
    .innerJoin(storeProducts, eq(stapleProducts.storeProductId, storeProducts.id))
    .where(inArray(stapleProducts.stapleId, stapleIds));

  // Group links by stapleId
  const linksByStaple = new Map<number, typeof allLinks>();
  for (const link of allLinks) {
    const existing = linksByStaple.get(link.stapleId) ?? [];
    existing.push(link);
    linksByStaple.set(link.stapleId, existing);
  }

  const result = items.map((item) => {
    const links = linksByStaple.get(item.staples.id) ?? [];
    const prices: Record<string, { price: number | null; productName: string }> = {};
    for (const link of links) {
      prices[link.storeId] = {
        price: link.salePrice ?? link.price,
        productName: link.productName,
      };
    }
    return {
      cartItemId: item.smart_cart_items.id,
      stapleId: item.staples.id,
      name: item.staples.name,
      category: item.staples.category,
      quantity: item.smart_cart_items.quantity,
      prices,
    };
  });

  return NextResponse.json({ items: result });
}

export async function POST(req: NextRequest) {
  const { stapleId, quantity = 1 } = await req.json();

  const existing = await db
    .select()
    .from(smartCartItems)
    .where(eq(smartCartItems.stapleId, stapleId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(smartCartItems)
      .set({ quantity: existing[0].quantity + quantity })
      .where(eq(smartCartItems.id, existing[0].id));
  } else {
    await db.insert(smartCartItems).values({ stapleId, quantity });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const { cartItemId, quantity } = await req.json();

  if (quantity <= 0) {
    await db.delete(smartCartItems).where(eq(smartCartItems.id, cartItemId));
  } else {
    await db
      .update(smartCartItems)
      .set({ quantity })
      .where(eq(smartCartItems.id, cartItemId));
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { cartItemId } = await req.json();
  await db.delete(smartCartItems).where(eq(smartCartItems.id, cartItemId));
  return NextResponse.json({ ok: true });
}
