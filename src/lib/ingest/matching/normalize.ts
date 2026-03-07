const SIZE_PATTERNS = [
  /\b\d+(\.\d+)?\s*(oz|fl\s*oz|ml|l|lb|lbs|kg|g|gal|qt|pt|ct|pk|pack)\b/gi,
  /\b\d+\s*x\s*\d+/gi, // e.g., "12 x 355ml"
];

const NOISE_WORDS = [
  /\b(each|per|approx|approximately|about)\b/gi,
];

export function normalizeName(name: string): string {
  let normalized = name.toLowerCase().trim();

  // Remove size/weight info
  for (const pattern of SIZE_PATTERNS) {
    normalized = normalized.replace(pattern, "");
  }

  // Remove noise words
  for (const pattern of NOISE_WORDS) {
    normalized = normalized.replace(pattern, "");
  }

  // Remove special characters except spaces and hyphens
  normalized = normalized.replace(/[^a-z0-9\s-]/g, "");

  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}

export function extractSize(name: string): string | null {
  for (const pattern of SIZE_PATTERNS) {
    const match = name.match(pattern);
    if (match) return match[0].trim();
  }
  return null;
}

export function extractBrand(name: string, knownBrands: string[]): string | null {
  const lower = name.toLowerCase();
  for (const brand of knownBrands) {
    if (lower.startsWith(brand.toLowerCase())) {
      return brand;
    }
  }
  return null;
}
