export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Generate a unique, collision-free slug: `slugified-name-ID` */
export function productToSlug(name: string, id: number): string {
  return `${toSlug(name)}-${id}`;
}

/** Extract the product ID from a slug like `chicken-breast-1234` */
export function slugToId(slug: string): number | null {
  const match = slug.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}
