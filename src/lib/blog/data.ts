import { taggedSql } from "@/lib/db";

export interface BlogPostSummary {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
}

export interface BlogPostFull extends BlogPostSummary {
  content: string;
}

export async function getBlogPosts(limit = 50, offset = 0): Promise<BlogPostSummary[]> {
  const rows = await taggedSql`
    SELECT slug, title, description, category, tags, published_at, updated_at
    FROM blog_posts
    ORDER BY published_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return (rows as any[]).map((r) => ({
    slug: r.slug,
    title: r.title,
    description: r.description,
    category: r.category,
    tags: r.tags ? JSON.parse(r.tags) : [],
    publishedAt: r.published_at,
    updatedAt: r.updated_at,
  }));
}

export async function getBlogPost(slug: string): Promise<BlogPostFull | null> {
  const rows = await taggedSql`
    SELECT slug, title, description, content, category, tags, published_at, updated_at
    FROM blog_posts
    WHERE slug = ${slug}
    LIMIT 1
  `;

  const r = (rows as any[])[0];
  if (!r) return null;

  return {
    slug: r.slug,
    title: r.title,
    description: r.description,
    content: r.content,
    category: r.category,
    tags: r.tags ? JSON.parse(r.tags) : [],
    publishedAt: r.published_at,
    updatedAt: r.updated_at,
  };
}

export async function getBlogSlugs(): Promise<string[]> {
  const rows = await taggedSql`SELECT slug FROM blog_posts ORDER BY published_at DESC`;
  return (rows as any[]).map((r) => r.slug);
}

export async function getBlogPostCount(): Promise<number> {
  const rows = await taggedSql`SELECT COUNT(*) AS count FROM blog_posts`;
  return Number((rows as any[])[0]?.count ?? 0);
}
