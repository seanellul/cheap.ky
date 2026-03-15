import { formatKYD } from "./currency";

// ── Types ─────────────────────────────────────────────────────────────

export interface ParsedSize {
  size: number; // numeric quantity in canonical unit
  unit: string; // canonical unit: g, ml, oz, fl_oz, ea
}

export interface UnitPrice {
  unitPrice: number;
  label: string; // e.g. "100g", "oz", "100ml"
}

// ── Unit normalization ────────────────────────────────────────────────

const UNIT_CANONICAL: Record<string, string> = {
  // Weight
  g: "g", gram: "g", grams: "g", gr: "g", gm: "g",
  kg: "g", kilogram: "g", kilograms: "g", kilo: "g",
  oz: "oz", ounce: "oz", ounces: "oz",
  lb: "oz", lbs: "oz", pound: "oz", pounds: "oz",
  // Volume
  ml: "ml", milliliter: "ml", millilitre: "ml", milliliters: "ml", millilitres: "ml",
  l: "ml", liter: "ml", litre: "ml", liters: "ml", litres: "ml", lt: "ml", ltr: "ml",
  "fl oz": "fl_oz", "fl. oz": "fl_oz", "fl.oz": "fl_oz",
  "fluid oz": "fl_oz", "fluid ounce": "fl_oz", "fluid ounces": "fl_oz",
  gal: "ml", gallon: "ml", gallons: "ml",
  qt: "ml", quart: "ml", quarts: "ml",
  pt: "ml", pint: "ml", pints: "ml",
  // Count
  ct: "ea", count: "ea", pk: "ea", pack: "ea", pck: "ea",
  ea: "ea", each: "ea",
};

// Multiplier to convert to canonical base unit
const TO_CANONICAL: Record<string, number> = {
  kg: 1000, kilogram: 1000, kilograms: 1000, kilo: 1000,
  l: 1000, liter: 1000, litre: 1000, liters: 1000, litres: 1000, lt: 1000, ltr: 1000,
  lb: 16, lbs: 16, pound: 16, pounds: 16,
  gal: 3785.41, gallon: 3785.41, gallons: 3785.41,
  qt: 946.353, quart: 946.353, quarts: 946.353,
  pt: 473.176, pint: 473.176, pints: 473.176,
};

// ── Parsing regexes ───────────────────────────────────────────────────

// Multi-pack: "12 x 355ml", "6x330ml", "24 X 12oz"
const MULTIPACK_RE =
  /(\d+)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(ml|l|liter|litre|liters|litres|lt|ltr|g|gram|grams|gr|gm|kg|kilogram|kilograms|kilo|oz|ounce|ounces|fl\.?\s*oz|fluid\s*(?:oz|ounce|ounces)|lb|lbs|pound|pounds|gal|gallon|gallons|qt|quart|quarts|pt|pint|pints|ct|count)\b/i;

// Simple: "500ml", "1.5L", "12oz", "2.5kg", "16 fl oz"
const SIMPLE_RE =
  /(\d+(?:\.\d+)?)\s*(ml|l|liter|litre|liters|litres|lt|ltr|g|gram|grams|gr|gm|kg|kilogram|kilograms|kilo|oz|ounce|ounces|fl\.?\s*oz|fluid\s*(?:oz|ounce|ounces)|lb|lbs|pound|pounds|gal|gallon|gallons|qt|quart|quarts|pt|pint|pints|ct|count|pk|pack|pck|ea|each)\b/i;

// Pack count without unit: "12 Pack", "6pk", "24 cans"
const PACK_COUNT_RE = /(\d+)\s*(?:pk|pack|pck|cans?|bottles?|ctn|carton)\b/i;

// ── Parse size from string ────────────────────────────────────────────

export function parseSize(
  sizeStr: string | null | undefined,
  nameStr?: string | null
): ParsedSize | null {
  const sources = [sizeStr, nameStr].filter(Boolean) as string[];

  for (const source of sources) {
    // Try multi-pack first
    const multi = source.match(MULTIPACK_RE);
    if (multi) {
      const count = parseFloat(multi[1]);
      const perUnit = parseFloat(multi[2]);
      const rawUnit = multi[3].toLowerCase().trim();
      const canonical = UNIT_CANONICAL[rawUnit];
      if (canonical && count > 0 && perUnit > 0) {
        const multiplier = TO_CANONICAL[rawUnit] ?? 1;
        return { size: count * perUnit * multiplier, unit: canonical };
      }
    }

    // Try simple size
    const simple = source.match(SIMPLE_RE);
    if (simple) {
      const qty = parseFloat(simple[1]);
      const rawUnit = simple[2].toLowerCase().trim();
      const canonical = UNIT_CANONICAL[rawUnit];
      if (canonical && qty > 0) {
        const multiplier = TO_CANONICAL[rawUnit] ?? 1;
        return { size: qty * multiplier, unit: canonical };
      }
    }
  }

  // Fallback: pack count
  for (const source of sources) {
    const pack = source.match(PACK_COUNT_RE);
    if (pack) {
      const count = parseFloat(pack[1]);
      if (count > 0) return { size: count, unit: "ea" };
    }
  }

  return null;
}

// ── Compute unit price ────────────────────────────────────────────────

const WEIGHT_UNITS = new Set(["g", "oz"]);
const VOLUME_UNITS = new Set(["ml", "fl_oz"]);

export function computeUnitPrice(
  price: number,
  unitSize: number | null,
  unitType: string | null
): UnitPrice | null {
  if (!unitSize || !unitType || price <= 0 || unitSize <= 0) return null;

  // Skip "each" — not meaningful
  if (unitType === "ea") return null;

  if (unitType === "g") {
    return { unitPrice: (price / unitSize) * 100, label: "100g" };
  }
  if (unitType === "ml") {
    return { unitPrice: (price / unitSize) * 100, label: "100ml" };
  }
  if (unitType === "oz") {
    return { unitPrice: price / unitSize, label: "oz" };
  }
  if (unitType === "fl_oz") {
    return { unitPrice: price / unitSize, label: "fl oz" };
  }

  return null;
}

// ── Format for display ────────────────────────────────────────────────

export function formatUnitPrice(
  price: number,
  unitSize: number | null,
  unitType: string | null
): string | null {
  const up = computeUnitPrice(price, unitSize, unitType);
  if (!up) return null;
  return `${formatKYD(up.unitPrice)}/${up.label}`;
}
