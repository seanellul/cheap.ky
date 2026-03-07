import { NextResponse } from "next/server";
import { rawSql } from "@/lib/db";

export async function GET() {
  const rows = await rawSql(
    `SELECT
       sp.id AS store_product_id,
       sp.store_id,
       sp.name,
       sp.brand,
       sp.size,
       sp.price,
       sp.sale_price,
       sp.image_url,
       sp.source_url,
       s.name AS store_name,
       p.id AS product_id,
       p.canonical_name
     FROM store_products sp
     JOIN stores s ON s.id = sp.store_id
     LEFT JOIN product_matches pm ON pm.store_product_id = sp.id
     LEFT JOIN products p ON p.id = pm.product_id
     WHERE sp.is_promo = true
       AND sp.price IS NOT NULL
       AND sp.in_stock = true
       AND (sp.promo_ends_at IS NULL OR sp.promo_ends_at > NOW())
     ORDER BY s.name, sp.name
     LIMIT 200`
  );

  // Group by store
  const grouped: Record<
    string,
    {
      storeId: string;
      storeName: string;
      items: Array<{
        storeProductId: number;
        productId: number | null;
        name: string;
        brand: string | null;
        size: string | null;
        price: number | null;
        salePrice: number | null;
        imageUrl: string | null;
        sourceUrl: string | null;
      }>;
    }
  > = {};

  for (const row of rows) {
    const storeId = String(row.store_id);
    if (!grouped[storeId]) {
      grouped[storeId] = {
        storeId,
        storeName: String(row.store_name),
        items: [],
      };
    }
    grouped[storeId].items.push({
      storeProductId: Number(row.store_product_id),
      productId: row.product_id != null ? Number(row.product_id) : null,
      name: row.canonical_name ? String(row.canonical_name) : String(row.name),
      brand: row.brand as string | null,
      size: row.size as string | null,
      price: row.price != null ? Number(row.price) : null,
      salePrice: row.sale_price != null ? Number(row.sale_price) : null,
      imageUrl: row.image_url as string | null,
      sourceUrl: row.source_url as string | null,
    });
  }

  return NextResponse.json({ stores: Object.values(grouped) });
}
