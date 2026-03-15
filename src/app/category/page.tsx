export const revalidate = 3600;

import type { Metadata } from "next";
import Link from "next/link";
import { getCategories } from "@/lib/data/categories";
import { ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Grocery Categories in Cayman Islands",
  description:
    "Browse grocery categories and compare prices across Cayman Islands stores including Foster's, Hurley's, Kirk Market, Cost-U-Less, and Priced Right. Find the cheapest prices on dairy, frozen foods, snacks, and more.",
  alternates: {
    canonical: "https://cheap.ky/category",
  },
};

const CATEGORY_EMOJI: Record<string, string> = {
  dairy: "\uD83E\uDDC0",
  produce: "\uD83E\uDD6C",
  bakery: "\uD83C\uDF5E",
  beverages: "\uD83E\uDD64",
  meat: "\uD83E\uDD69",
  frozen: "\uD83E\uDDCA",
  snacks: "\uD83C\uDF7F",
  household: "\uD83E\uDDF9",
  pantry: "\uD83E\uDD6B",
  deli: "\uD83E\uDD6A",
  coffee: "\u2615",
  condiments: "\uD83E\uDED9",
  seafood: "\uD83E\uDD90",
  baby: "\uD83C\uDF7C",
  pets: "\uD83D\uDC3E",
  health: "\uD83D\uDC8A",
  cereal: "\uD83E\uDD63",
  pasta: "\uD83C\uDF5D",
  candy: "\uD83C\uDF6C",
  beer: "\uD83C\uDF7A",
  wine: "\uD83C\uDF77",
  water: "\uD83D\uDCA7",
  juice: "\uD83E\uDDC3",
  cheese: "\uD83E\uDDC0",
  bread: "\uD83E\uDD56",
  canned: "\uD83E\uDD6B",
  cleaning: "\uD83E\uDDF4",
  paper: "\uD83E\uDDFB",
};

function getCategoryEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return "\uD83D\uDED2";
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <Link href="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Categories</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold sm:text-3xl tracking-tight">
          Grocery Categories
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Browse {categories.length} product categories across Cayman Islands
          grocery stores
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories
          .filter((c) => c.productCount >= 10)
          .map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="border rounded-xl p-4 bg-card hover:bg-muted/50 hover:border-primary/30 transition-colors group"
            >
              <div className="font-semibold group-hover:text-primary transition-colors">
                <span className="mr-1.5">{getCategoryEmoji(cat.name)}</span>
                {cat.name}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span>{cat.productCount.toLocaleString()} products</span>
                {cat.matchedCount > 0 && (
                  <span className="text-xs bg-savings/10 text-savings px-1.5 py-0.5 rounded-full">
                    {cat.matchedCount} comparable
                  </span>
                )}
              </div>
            </Link>
          ))}
      </div>

      {/* Smaller categories */}
      {categories.filter((c) => c.productCount < 10 && c.productCount >= 5)
        .length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">More Categories</h2>
          <div className="flex flex-wrap gap-2">
            {categories
              .filter((c) => c.productCount < 10 && c.productCount >= 5)
              .map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                >
                  {cat.name}
                  <span className="text-xs text-muted-foreground tabular-nums">
                    ({cat.productCount})
                  </span>
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
