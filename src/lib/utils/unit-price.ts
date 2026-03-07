// Unit size parsing and normalized unit price calculation

interface ParsedUnit {
  unitSize: number;
  unitType: string;
}

interface UnitPrice {
  unitPrice: number;
  per: string;
}

const UNIT_ALIASES: Record<string, string> = {
  ml: "ml",
  milliliter: "ml",
  millilitre: "ml",
  milliliters: "ml",
  millilitres: "ml",
  l: "l",
  liter: "l",
  litre: "l",
  liters: "l",
  litres: "l",
  lt: "l",
  ltr: "l",
  g: "g",
  gram: "g",
  grams: "g",
  gr: "g",
  gm: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  kilo: "kg",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  "fl oz": "fl oz",
  "fl. oz": "fl oz",
  "fl.oz": "fl oz",
  "fluid oz": "fl oz",
  "fluid ounce": "fl oz",
  "fluid ounces": "fl oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  gal: "gal",
  gallon: "gal",
  gallons: "gal",
  qt: "qt",
  quart: "qt",
  quarts: "qt",
  pt: "pt",
  pint: "pt",
  pints: "pt",
  ct: "ct",
  count: "ct",
  pk: "pk",
  pack: "pk",
  pck: "pk",
  ea: "ct",
  each: "ct",
};

// Regex to match multi-pack patterns like "12 x 355ml", "6x330ml", "12 X 12oz"
const MULTIPACK_RE =
  /(\d+)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(ml|l|liter|litre|liters|litres|lt|ltr|g|gram|grams|gr|gm|kg|kilogram|kilograms|kilo|oz|ounce|ounces|fl\.?\s*oz|fluid\s*oz|fluid\s*ounce|fluid\s*ounces|lb|lbs|pound|pounds|gal|gallon|gallons|qt|quart|quarts|pt|pint|pints|ct|count)\b/i;

// Regex to match simple size like "500ml", "1.5L", "12oz", "2.5kg"
const SIMPLE_SIZE_RE =
  /(\d+(?:\.\d+)?)\s*(ml|l|liter|litre|liters|litres|lt|ltr|g|gram|grams|gr|gm|kg|kilogram|kilograms|kilo|oz|ounce|ounces|fl\.?\s*oz|fluid\s*oz|fluid\s*ounce|fluid\s*ounces|lb|lbs|pound|pounds|gal|gallon|gallons|qt|quart|quarts|pt|pint|pints|ct|count|pk|pack|pck|ea|each)\b/i;

// Regex for pack count without unit like "12 Pack", "6pk"
const PACK_COUNT_RE = /(\d+)\s*(?:pk|pack|pck|cans?|bottles?|ctn|carton)\b/i;

function normalizeUnit(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return UNIT_ALIASES[lower] ?? lower;
}

export function parseUnitSize(
  name: string,
  sizeField?: string | null
): ParsedUnit | null {
  // Try size field first, then product name
  const sources = [sizeField, name].filter(Boolean) as string[];

  for (const source of sources) {
    // Try multi-pack pattern first
    const multiMatch = source.match(MULTIPACK_RE);
    if (multiMatch) {
      const count = parseFloat(multiMatch[1]);
      const size = parseFloat(multiMatch[2]);
      const unit = normalizeUnit(multiMatch[3]);
      if (count > 0 && size > 0) {
        return { unitSize: count * size, unitType: unit };
      }
    }

    // Try simple size pattern
    const simpleMatch = source.match(SIMPLE_SIZE_RE);
    if (simpleMatch) {
      const size = parseFloat(simpleMatch[1]);
      const unit = normalizeUnit(simpleMatch[2]);
      if (size > 0) {
        return { unitSize: size, unitType: unit };
      }
    }
  }

  // Try pack count as fallback (e.g. "12 Pack")
  for (const source of sources) {
    const packMatch = source.match(PACK_COUNT_RE);
    if (packMatch) {
      const count = parseFloat(packMatch[1]);
      if (count > 0) {
        return { unitSize: count, unitType: "ct" };
      }
    }
  }

  return null;
}

// Conversion constants
const G_PER_OZ = 28.3495;
const G_PER_LB = 453.592;
const ML_PER_FL_OZ = 29.5735;
const ML_PER_L = 1000;
const ML_PER_GAL = 3785.41;
const ML_PER_QT = 946.353;
const ML_PER_PT = 473.176;

function toGrams(size: number, unit: string): number | null {
  switch (unit) {
    case "g":
      return size;
    case "kg":
      return size * 1000;
    case "oz":
      return size * G_PER_OZ;
    case "lb":
      return size * G_PER_LB;
    default:
      return null;
  }
}

function toMl(size: number, unit: string): number | null {
  switch (unit) {
    case "ml":
      return size;
    case "l":
      return size * ML_PER_L;
    case "fl oz":
      return size * ML_PER_FL_OZ;
    case "gal":
      return size * ML_PER_GAL;
    case "qt":
      return size * ML_PER_QT;
    case "pt":
      return size * ML_PER_PT;
    default:
      return null;
  }
}

const WEIGHT_UNITS = new Set(["g", "kg", "oz", "lb"]);
const VOLUME_UNITS = new Set(["ml", "l", "fl oz", "gal", "qt", "pt"]);
const COUNT_UNITS = new Set(["ct", "pk"]);

export function calculateUnitPrice(
  price: number,
  unitSize: number | null,
  unitType: string | null
): UnitPrice | null {
  if (!unitSize || !unitType || price <= 0 || unitSize <= 0) return null;

  if (WEIGHT_UNITS.has(unitType)) {
    const grams = toGrams(unitSize, unitType);
    if (!grams || grams <= 0) return null;
    return { unitPrice: (price / grams) * 100, per: "100g" };
  }

  if (VOLUME_UNITS.has(unitType)) {
    const ml = toMl(unitSize, unitType);
    if (!ml || ml <= 0) return null;
    return { unitPrice: (price / ml) * 100, per: "100ml" };
  }

  if (COUNT_UNITS.has(unitType)) {
    return { unitPrice: price / unitSize, per: "ea" };
  }

  return null;
}
