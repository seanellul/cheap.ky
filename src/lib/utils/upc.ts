/**
 * Normalize a UPC/EAN code to a standard format for matching.
 *
 * Barcodes scanners return UPC-A (12 digits) or EAN-13 (13 digits).
 * The Freshop API often strips leading zeros, giving us 10-11 digit codes.
 * We normalize everything to 12 digits (UPC-A) by zero-padding on the left.
 * 13-digit EAN codes are kept as-is.
 *
 * Returns null for invalid/internal PLU codes (< 6 digits) or non-numeric strings.
 */
export function normalizeUpc(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Strip whitespace and any non-digit characters (hyphens, spaces)
  const digits = raw.replace(/\D/g, "");

  // Too short = internal PLU code, not a scannable barcode
  if (digits.length < 6) return null;

  // Already EAN-13
  if (digits.length === 13) return digits;

  // Pad to 12 digits (UPC-A)
  if (digits.length <= 12) return digits.padStart(12, "0");

  // Longer than 13 digits — likely invalid, but try truncating leading zeros
  const trimmed = digits.replace(/^0+/, "");
  if (trimmed.length <= 12) return trimmed.padStart(12, "0");
  if (trimmed.length === 13) return trimmed;

  // Truly invalid
  return null;
}
