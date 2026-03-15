import { NextResponse } from "next/server";
import { rawSql } from "@/lib/db";
import { toSlug } from "@/lib/utils/slug";

/** Simplify raw category to display name: "Shop / Grocery / Dairy" -> "Dairy" */
function simplifyCategory(raw: string): string {
  const parts = raw.split(" / ");
  return parts.length > 2 ? parts.slice(2).join(" / ") : parts[parts.length - 1];
}

export async function GET() {
  const rows = await rawSql(
    `SELECT sp.category_raw, COUNT(DISTINCT sp.id) as product_count
     FROM store_products sp
     WHERE sp.category_raw IS NOT NULL
     GROUP BY sp.category_raw
     HAVING COUNT(DISTINCT sp.id) >= 10
     ORDER BY COUNT(DISTINCT sp.id) DESC`
  );

  const slugMap = new Map<string, { name: string; slug: string }>();

  for (const row of rows) {
    const name = simplifyCategory(String(row.category_raw));
    const slug = toSlug(name);
    if (!slug || slugMap.has(slug)) continue;
    slugMap.set(slug, { name, slug });
  }

  return NextResponse.json(Array.from(slugMap.values()));
}
