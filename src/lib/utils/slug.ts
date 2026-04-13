export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Generate a unique, collision-free slug: `slugified-name-ID` */
export function productToSlug(name: string, id: number): string {
  const idSuffix = `-${id}`;
  const maxNameLen = 128 - idSuffix.length;
  let slug = toSlug(name);
  if (slug.length > maxNameLen) {
    slug = slug.slice(0, maxNameLen).replace(/-$/, "");
  }
  return `${slug}${idSuffix}`;
}

/** Extract the product ID from a slug like `chicken-breast-1234` */
export function slugToId(slug: string): number | null {
  const match = slug.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}
