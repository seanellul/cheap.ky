import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "price-comp.db");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const productId = parseInt(id);
  if (isNaN(productId)) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  const sqlite = new Database(dbPath, { readonly: true });

  try {
    // Get canonical product
    const product = sqlite
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(productId) as {
      id: number;
      canonical_name: string;
      brand: string | null;
      size: string | null;
      upc: string | null;
      image_url: string | null;
    } | undefined;

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get all store matches with full store product details
    const storeMatches = sqlite
      .prepare(
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
          sp.category_raw,
          sp.source_url,
          pm.match_method,
          pm.confidence,
          s.name as store_name
        FROM product_matches pm
        JOIN store_products sp ON pm.store_product_id = sp.id
        JOIN stores s ON sp.store_id = s.id
        WHERE pm.product_id = ?`
      )
      .all(productId) as Array<{
      store_product_id: number;
      store_id: string;
      name: string;
      brand: string | null;
      size: string | null;
      price: number | null;
      sale_price: number | null;
      image_url: string | null;
      upc: string | null;
      category_raw: string | null;
      source_url: string | null;
      match_method: string;
      confidence: number;
      store_name: string;
    }>;

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
        categoryRaw: m.category_raw,
        sourceUrl: m.source_url,
        matchMethod: m.match_method,
        confidence: m.confidence,
      })),
    });
  } finally {
    sqlite.close();
  }
}
