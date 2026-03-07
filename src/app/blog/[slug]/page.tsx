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
            className="blog-content prose prose-neutral dark:prose-invert max-w-none
              prose-headings:font-bold prose-headings:tracking-tight prose-headings:mt-8 prose-headings:mb-4
              prose-h2:text-xl prose-h2:border-b prose-h2:pb-2 prose-h2:border-border
              prose-p:leading-relaxed prose-p:text-foreground/90
              prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline
              prose-strong:text-foreground prose-strong:font-semibold
              prose-em:text-muted-foreground
              prose-li:text-foreground/90
              prose-ul:my-4 prose-ol:my-4
              prose-table:my-6 prose-table:border prose-table:border-border prose-table:rounded-xl prose-table:overflow-hidden prose-table:text-sm
              prose-thead:bg-muted/50
              prose-th:py-3 prose-th:px-4 prose-th:text-left prose-th:font-semibold prose-th:text-foreground prose-th:border-b prose-th:border-border
              prose-td:py-2.5 prose-td:px-4 prose-td:border-b prose-td:border-border/50
              prose-tr:transition-colors hover:prose-tr:bg-muted/30"
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
