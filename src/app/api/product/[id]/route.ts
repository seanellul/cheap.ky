import { NextRequest, NextResponse } from "next/server";
import { rawSql } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const productId = parseInt(id);
  if (isNaN(productId)) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  // Get canonical product
  const products = await rawSql(
    `SELECT * FROM products WHERE id = $1`,
    [productId]
  );

  if (products.length === 0) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const product = products[0];

  // Get all store matches with full store product details
  const storeMatches = await rawSql(
    `SELECT
      sp.id as store_product_id,
      sp.store_id,
      sp.name,
      sp.brand,
      sp.size,
      sp.price,
      sp.sale_price,
      sp.image_url,
      sp.upc,
      sp.unit_size,
      sp.unit_type,
      sp.category_raw,
      sp.source_url,
      pm.match_method,
      pm.confidence,
      s.name as store_name
    FROM product_matches pm
    JOIN store_products sp ON pm.store_product_id = sp.id
    JOIN stores s ON sp.store_id = s.id
    WHERE pm.product_id = $1`,
    [productId]
  );

  return NextResponse.json({
    product: {
      id: product.id,
      name: product.canonical_name,
      brand: product.brand,
      size: product.size,
      upc: product.upc,
      imageUrl: product.image_url,
    },
    storeMatches: storeMatches.map((m) => ({
      storeProductId: m.store_product_id,
      storeId: m.store_id,
      storeName: m.store_name,
      name: m.name,
      brand: m.brand,
      size: m.size,
      price: m.price,
      salePrice: m.sale_price,
      imageUrl: m.image_url,
      upc: m.upc,
      unitSize: m.unit_size != null ? Number(m.unit_size) : null,
      unitType: m.unit_type as string | null,
      categoryRaw: m.category_raw,
      sourceUrl: m.source_url,
      matchMethod: m.match_method,
      confidence: m.confidence,
    })),
  });
}
