export const revalidate = 3600;

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { getBlogPost, getBlogPosts } from "@/lib/blog/data";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: "Article Not Found" };

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: `${post.title} -- Cheap.ky`,
      description: post.description,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
    },
    alternates: {
      canonical: `https://cheap.ky/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  // Get related posts (same category, excluding current)
  const allPosts = await getBlogPosts(50);
  const related = allPosts
    .filter((p) => p.slug !== slug && p.category === post.category)
    .slice(0, 4);

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    publisher: {
      "@type": "Organization",
      name: "Cheap.ky",
      url: "https://cheap.ky",
    },
    mainEntityOfPage: `https://cheap.ky/blog/${post.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
          <Link href="/blog" className="hover:text-primary transition-colors">
            Blog
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium line-clamp-1">
            {post.title}
          </span>
        </nav>

        {/* Article */}
        <article className="max-w-3xl">
          <header className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {post.title}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
              {post.updatedAt !== post.publishedAt && (
                <span className="text-xs">
                  (Updated{" "}
                  {new Date(post.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                  )
                </span>
              )}
            </div>
          </header>

          <div
            className="prose prose-sm dark:prose-invert max-w-none
              prose-headings:font-bold prose-headings:tracking-tight
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-table:border prose-table:rounded-xl prose-table:overflow-hidden
              prose-thead:bg-muted/40
              prose-th:py-2.5 prose-th:px-3 prose-th:text-sm prose-th:font-medium
              prose-td:py-2 prose-td:px-3 prose-td:text-sm
              prose-tr:border-b"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>

        {/* Related articles */}
        {related.length > 0 && (
          <section className="max-w-3xl">
            <h2 className="text-lg font-semibold mb-3">Related Articles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="rounded-xl border bg-card p-4 hover:border-primary/30 transition-colors group"
                >
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2">
                    {r.title}
                  </h3>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(r.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
