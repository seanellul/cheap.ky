export const revalidate = 3600;

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getBlogPosts } from "@/lib/blog/data";

const CATEGORY_LABELS: Record<string, string> = {
  "weekly-report": "Weekly Report",
  "price-gaps": "Price Gaps",
  "store-comparison": "Store vs Store",
  "category-spotlight": "Category Spotlight",
  evergreen: "Guide",
};

export const metadata: Metadata = {
  title: "Cayman Grocery Price Blog",
  description:
    "Weekly price reports, store comparisons, and savings tips for grocery shopping in the Cayman Islands. Data-driven analysis across Foster's, Hurley's, Kirk Market, Cost-U-Less, and Priced Right.",
  alternates: {
    canonical: "https://cheap.ky/blog",
  },
};

export default async function BlogIndexPage() {
  const posts = await getBlogPosts(100);

  // Group by category
  const grouped = new Map<string, typeof posts>();
  for (const post of posts) {
    const existing = grouped.get(post.category) ?? [];
    existing.push(post);
    grouped.set(post.category, existing);
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://cheap.ky" },
      { "@type": "ListItem", position: 2, name: "Blog" },
    ],
  };

  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
    />
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
        <span className="text-foreground font-medium">Blog</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold sm:text-3xl tracking-tight">
          Cayman Grocery Price Blog
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Data-driven price reports and analysis updated weekly
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No articles yet. Check back soon!
        </div>
      ) : (
        <>
          {/* Latest post featured */}
          {posts[0] && (
            <Link
              href={`/blog/${posts[0].slug}`}
              className="block rounded-2xl border bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 p-6 hover:border-primary/30 transition-colors group"
            >
              <div className="text-xs font-medium text-primary mb-2">
                {CATEGORY_LABELS[posts[0].category] ?? posts[0].category}
              </div>
              <h2 className="text-xl font-bold group-hover:text-primary transition-colors">
                {posts[0].title}
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                {posts[0].description}
              </p>
              <div className="text-xs text-muted-foreground mt-3">
                {new Date(posts[0].publishedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </Link>
          )}

          {/* All posts grid */}
          {posts.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {posts.slice(1).map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="rounded-xl border bg-card p-4 hover:border-primary/30 hover:bg-muted/50 transition-colors group"
                >
                  <div className="text-xs font-medium text-primary mb-1.5">
                    {CATEGORY_LABELS[post.category] ?? post.category}
                  </div>
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {post.description}
                  </p>
                  <div className="text-xs text-muted-foreground mt-2">
                    {new Date(post.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
    </>
  );
}
