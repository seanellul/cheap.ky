import { chromium, type Browser, type Page } from "playwright";
import type { StoreAdapter, RawProduct } from "../types";

const BASE_URL = "https://www.shopright.ky";
const PAGE_DELAY = 500; // ms between page requests
const PAGE_TIMEOUT = 30_000;

// Grocery-relevant leaf categories to crawl
// We skip non-grocery (Beauty, Home, Liquor, Baby, Toys, Party, Pet, Office, Souvenirs, Auto, Medicine)
const GROCERY_CATEGORIES = [
  { slug: "frozen", name: "Frozen" },
  { slug: "soft-drinks", name: "Soft Drinks" },
  { slug: "water", name: "Water" },
  { slug: "cocktails-mixers", name: "Cocktails & Mixers" },
  { slug: "fruit-juice", name: "Fruit Juice" },
  { slug: "iced-tea-hot-chocolate", name: "Iced Tea & Hot Chocolate" },
  { slug: "specialty-drinks", name: "Specialty Drinks" },
  { slug: "sports-energy-drinks", name: "Sports & Energy Drinks" },
  { slug: "tea-hot-chocolate", name: "Tea & Hot Chocolate" },
  { slug: "coffee", name: "Coffee" },
  { slug: "coffee-espresso", name: "Coffee - Espresso" },
  { slug: "tea", name: "Tea" },
  { slug: "cocoa", name: "Cocoa" },
  { slug: "fruits-vegetables", name: "Fruits & Vegetables" },
  { slug: "bread-bakery", name: "Bread & Bakery" },
  { slug: "deli", name: "Deli" },
  { slug: "eggs-dairy", name: "Eggs & Dairy" },
  { slug: "indian-foods", name: "Indian Foods" },
  { slug: "international-foods", name: "International Foods" },
  { slug: "meat-seafood", name: "Meat & Seafood" },
  { slug: "pantry", name: "Pantry" },
  { slug: "snacks-candy", name: "Snacks & Candy" },
  { slug: "cayman-islands-speciality", name: "Cayman Islands Speciality" },
  { slug: "chips-dips", name: "Chips & Dips" },
  { slug: "condiments-sauces", name: "Condiments-Sauces" },
];

interface ScrapedProduct {
  id: string;
  name: string;
  dollars: string;
  cents: string;
  oldDollars: string | null;
  oldCents: string | null;
  imageUrl: string;
  category: string;
}

export class ShoprightAdapter implements StoreAdapter {
  storeId = "shopright";

  async fetch(): Promise<RawProduct[]> {
    console.log(`[shopright] Starting Shopright scrape (${GROCERY_CATEGORIES.length} categories)...`);

    const browser = await chromium.launch({ headless: true });
    const seen = new Map<string, RawProduct>();
    let errorCount = 0;

    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(PAGE_TIMEOUT);

      for (const cat of GROCERY_CATEGORIES) {
        try {
          await this.scrapeCategory(page, cat.slug, cat.name, seen);
        } catch (e) {
          errorCount++;
          if (errorCount <= 5) {
            console.error(`[shopright] Error scraping category ${cat.slug}:`, e);
          }
        }
      }
    } finally {
      await browser.close();
    }

    const products = Array.from(seen.values());
    console.log(`[shopright] Scraped ${products.length} unique products (${errorCount} category errors)`);
    return products;
  }

  private async scrapeCategory(
    page: Page,
    slug: string,
    categoryName: string,
    seen: Map<string, RawProduct>
  ): Promise<void> {
    const url = `${BASE_URL}/${slug}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: PAGE_TIMEOUT });
    await page.waitForTimeout(1500);

    // Get total pages
    const totalPages = await page.evaluate(() => {
      const lastPageLink = document.querySelector(".pager .last-page a[data-page]");
      return lastPageLink ? parseInt(lastPageLink.getAttribute("data-page") || "1", 10) : 1;
    });

    const beforeCount = seen.size;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (pageNum > 1) {
        const pageUrl = `${url}?pagenumber=${pageNum}`;
        await page.goto(pageUrl, { waitUntil: "networkidle", timeout: PAGE_TIMEOUT });
        await page.waitForTimeout(1000);
      }

      const products = await this.extractProducts(page, categoryName);
      for (const p of products) {
        if (!seen.has(p.id)) {
          seen.set(p.id, this.toRawProduct(p));
        }
      }

      if (pageNum < totalPages) {
        await page.waitForTimeout(PAGE_DELAY);
      }
    }

    const newCount = seen.size - beforeCount;
    console.log(`[shopright]   ${slug}: ${newCount} new products (${totalPages} pages)`);
  }

  private async extractProducts(page: Page, category: string): Promise<ScrapedProduct[]> {
    return page.evaluate((cat) => {
      const items = document.querySelectorAll(".product-item[data-productid]");
      const results: ScrapedProduct[] = [];

      items.forEach((item) => {
        const id = item.getAttribute("data-productid");
        if (!id) return;

        const nameEl = item.querySelector(".product-title a");
        const name = nameEl?.textContent?.trim() || "";
        if (!name) return;

        // Price structure: <sup>$</sup> <span class="actual-price">X</span> <sup>YY</sup>
        const mainPrice = item.querySelector(".main-price");
        const actualPrice = mainPrice?.querySelector(".actual-price");
        const sups = mainPrice?.querySelectorAll("sup");
        const dollars = actualPrice?.textContent?.trim() || "0";
        const cents = sups && sups.length >= 2 ? sups[1]?.textContent?.trim() || "00" : "00";

        // Old price (if on sale)
        const oldPriceEl = item.querySelector(".old-price");
        let oldDollars: string | null = null;
        let oldCents: string | null = null;
        if (oldPriceEl) {
          const oldActual = oldPriceEl.querySelector(".actual-price");
          const oldSups = oldPriceEl.querySelectorAll("sup");
          oldDollars = oldActual?.textContent?.trim() || null;
          oldCents = oldSups && oldSups.length >= 2 ? oldSups[1]?.textContent?.trim() || "00" : "00";
        }

        // Image
        const imgEl = item.querySelector(".picture img") as HTMLImageElement | null;
        const imageUrl = imgEl?.src || "";

        results.push({ id, name, dollars, cents, oldDollars, oldCents, imageUrl, category: cat });
      });

      return results;
    }, category);
  }

  private toRawProduct(p: ScrapedProduct): RawProduct {
    const price = parseFloat(`${p.dollars}.${p.cents.padStart(2, "0")}`);
    let salePrice: number | null = null;

    if (p.oldDollars !== null) {
      // Old price exists = item is on sale. "old price" is the original, current display is the sale price.
      const originalPrice = parseFloat(`${p.oldDollars}.${(p.oldCents || "00").padStart(2, "0")}`);
      salePrice = price;
      return {
        sku: p.id,
        name: p.name,
        price: originalPrice,
        salePrice,
        imageUrl: p.imageUrl || null,
        categoryRaw: p.category,
        sourceUrl: `${BASE_URL}/productdetails/catalog/${p.id}`,
        inStock: true,
        isPromo: true,
        promoEndsAt: null,
      };
    }

    return {
      sku: p.id,
      name: p.name,
      price: isNaN(price) ? null : price,
      salePrice: null,
      imageUrl: p.imageUrl || null,
      categoryRaw: p.category,
      sourceUrl: `${BASE_URL}/productdetails/catalog/${p.id}`,
      inStock: true,
      isPromo: false,
      promoEndsAt: null,
    };
  }
}
