import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cartItems, products, productMatches, storeProducts, stores } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET() {
  const items = await db
    .select()
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id));

  if (items.length === 0) {
    return NextResponse.json({ items: [] });
  }

  // Single query for all product matches instead of N per-item queries
  const productIds = items.map((item) => item.products.id);
  const allMatches = await db
    .select({
      productId: productMatches.productId,
      storeProduct: storeProducts,
      store: stores,
    })
    .from(productMatches)
    .innerJoin(storeProducts, eq(productMatches.storeProductId, storeProducts.id))
    .innerJoin(stores, eq(storeProducts.storeId, stores.id))
    .where(inArray(productMatches.productId, productIds));

  // Group matches by productId
  const matchesByProduct = new Map<number, typeof allMatches>();
  for (const m of allMatches) {
    const existing = matchesByProduct.get(m.productId) ?? [];
    existing.push(m);
    matchesByProduct.set(m.productId, existing);
  }

  const result = items.map((item) => {
    const matches = matchesByProduct.get(item.products.id) ?? [];
    const prices: Record<string, number | null> = {};
    for (const m of matches) {
      prices[m.store.id] = m.storeProduct.salePrice ?? m.storeProduct.price;
    }
    return {
      cartItemId: item.cart_items.id,
      productId: item.products.id,
      name: item.products.canonicalName,
      brand: item.products.brand,
      size: item.products.size,
      imageUrl: item.products.imageUrl,
      quantity: item.cart_items.quantity,
      preferredStoreId: item.cart_items.preferredStoreId,
      notes: item.cart_items.notes,
      prices,
    };
  });

  return NextResponse.json({ items: result });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { productId, quantity = 1 } = body;

  const existing = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.productId, productId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(cartItems)
      .set({ quantity: existing[0].quantity + quantity })
      .where(eq(cartItems.id, existing[0].id));
  } else {
    await db.insert(cartItems).values({ productId, quantity });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { cartItemId, quantity, preferredStoreId, notes } = body;

  if (quantity !== undefined && quantity <= 0) {
    await db.delete(cartItems).where(eq(cartItems.id, cartItemId));
    return NextResponse.json({ ok: true });
  }

  const updates: Record<string, unknown> = {};
  if (quantity !== undefined) updates.quantity = quantity;
  if (preferredStoreId !== undefined) updates.preferredStoreId = preferredStoreId;
  if (notes !== undefined) updates.notes = notes;

  await db.update(cartItems).set(updates).where(eq(cartItems.id, cartItemId));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { cartItemId } = await req.json();
  await db.delete(cartItems).where(eq(cartItems.id, cartItemId));
  return NextResponse.json({ ok: true });
}
