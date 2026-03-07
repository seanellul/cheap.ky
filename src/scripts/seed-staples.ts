import { db } from "../lib/db";
import { staples, stapleProducts, storeProducts } from "../lib/db/schema";
import { ilike, and, eq, or, isNotNull } from "drizzle-orm";

const STAPLE_ITEMS = [
  // Produce
  { name: "Bananas", category: "Produce", keywords: ["banana", "yellow banana"] },
  { name: "Pineapple", category: "Produce", keywords: ["pineapple", "pineapple whole"] },
  { name: "Apples", category: "Produce", keywords: ["apple", "gala apple", "fuji apple", "red apple", "green apple"] },
  { name: "Broccoli", category: "Produce", keywords: ["broccoli", "broccoli crown", "broccoli bunch"] },
  { name: "Garlic", category: "Produce", keywords: ["garlic", "garlic bulb", "garlic head"] },
  { name: "Onions", category: "Produce", keywords: ["onion", "yellow onion", "white onion"] },
  { name: "Celery", category: "Produce", keywords: ["celery", "celery stalk", "celery bunch"] },
  { name: "Carrots", category: "Produce", keywords: ["carrot", "carrots"] },
  { name: "Potatoes", category: "Produce", keywords: ["potato", "russet potato", "white potato"] },

  // Meat & Poultry
  { name: "Chicken Wings (Fresh)", category: "Meat & Poultry", keywords: ["chicken wing"] },
  { name: "Minced/Ground Beef", category: "Meat & Poultry", keywords: ["ground beef", "minced beef", "mince beef"] },
  { name: "Beef Steak", category: "Meat & Poultry", keywords: ["beef steak", "ribeye", "sirloin steak", "ny strip"] },
  { name: "Ham (Deli)", category: "Meat & Poultry", keywords: ["ham slice", "deli ham", "sliced ham", "cooked ham"] },

  // Seafood
  { name: "Salmon Steak/Fillet", category: "Seafood", keywords: ["salmon fillet", "salmon steak", "salmon portion"] },
  { name: "Tuna Cans", category: "Seafood", keywords: ["tuna can", "tuna chunk", "tuna solid", "starkist tuna", "bumble bee tuna"] },

  // Dairy & Eggs
  { name: "Eggs (Dozen)", category: "Dairy & Eggs", keywords: ["egg", "eggs dozen", "large egg", "local egg"] },
  { name: "Milk (Fresh)", category: "Dairy & Eggs", keywords: ["whole milk", "2% milk", "1% milk", "fresh milk"] },
  { name: "Cheddar Cheese", category: "Dairy & Eggs", keywords: ["cheddar cheese", "cheddar block", "mild cheddar", "sharp cheddar"] },

  // Bakery & Pantry
  { name: "Bread (White)", category: "Bakery & Pantry", keywords: ["white bread", "sandwich bread"] },
  { name: "Pasta", category: "Bakery & Pantry", keywords: ["spaghetti", "penne", "pasta"] },
  { name: "Olives", category: "Bakery & Pantry", keywords: ["olive", "green olive", "black olive", "kalamata"] },

  // Pet
  { name: "Cat Food", category: "Pet", keywords: ["cat food", "cat chow"] },
  { name: "Cat Litter", category: "Pet", keywords: ["cat litter", "clumping litter"] },

  // Household
  { name: "Garbage Bags", category: "Household", keywords: ["garbage bag", "trash bag", "bin bag", "refuse bag"] },
];

async function seedStaples() {
  console.log("[seed] Seeding staple items...");

  for (let i = 0; i < STAPLE_ITEMS.length; i++) {
    const item = STAPLE_ITEMS[i];

    // Upsert staple
    const existing = await db
      .select()
      .from(staples)
      .where(eq(staples.name, item.name))
      .limit(1);

    let stapleId: number;

    if (existing.length > 0) {
      stapleId = existing[0].id;
      await db
        .update(staples)
        .set({
          category: item.category,
          keywords: JSON.stringify(item.keywords),
          sortOrder: i,
        })
        .where(eq(staples.id, stapleId));
    } else {
      const [inserted] = await db
        .insert(staples)
        .values({
          name: item.name,
          category: item.category,
          keywords: JSON.stringify(item.keywords),
          sortOrder: i,
        })
        .returning();
      stapleId = inserted.id;
    }

    // Auto-match: find cheapest relevant product at each store
    const storeIds = ["fosters", "hurleys", "costuless", "pricedright", "shopright"];

    for (const storeId of storeIds) {
      // Check if already manually linked
      const existingLink = await db
        .select()
        .from(stapleProducts)
        .where(
          and(
            eq(stapleProducts.stapleId, stapleId),
            eq(stapleProducts.storeId, storeId),
            eq(stapleProducts.autoMatched, false)
          )
        )
        .limit(1);

      if (existingLink.length > 0) continue; // Don't override manual links

      // Search for matching products using keywords
      // Use word-boundary-aware patterns to avoid substring false positives
      // e.g., "apple" should NOT match "Pineapple", "egg" should NOT match "Reggiano"
      const conditions = item.keywords.flatMap((kw) => [
        ilike(storeProducts.name, `${kw}%`),     // starts with keyword
        ilike(storeProducts.name, `% ${kw}%`),   // keyword after space
      ]);

      const matches = await db
        .select()
        .from(storeProducts)
        .where(
          and(
            eq(storeProducts.storeId, storeId),
            eq(storeProducts.inStock, true),
            isNotNull(storeProducts.price),
            or(...conditions)
          )
        );

      if (matches.length === 0) continue;

      // Score matches: prefer shorter names (more specific), lower price, and exact keyword match
      const scored = matches.map((m) => {
        const nameLower = m.name.toLowerCase();
        let score = 0;

        // Word-boundary keyword match boosts score
        for (const kw of item.keywords) {
          const kwLower = kw.toLowerCase();
          // Check if keyword appears as a whole word (not substring of another word)
          const regex = new RegExp(`(^|\\s)${kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$|s\\b|es\\b)`, 'i');
          if (regex.test(nameLower)) {
            score += 15; // strong match
          } else if (nameLower.includes(kwLower)) {
            score += 3; // weak substring match
          }
        }

        // Penalize very long names (likely combo packs or unrelated)
        score -= m.name.length * 0.1;

        // Penalize high prices (likely bulk/combo packs)
        if (m.price && m.price > 50) score -= 5;

        // Boost items in relevant categories
        const cat = (m.categoryRaw || "").toLowerCase();
        if (item.category === "Produce" && (cat.includes("produce") || cat.includes("fruit") || cat.includes("vegetable"))) score += 5;
        if (item.category === "Meat & Poultry" && (cat.includes("meat") || cat.includes("poultry") || cat.includes("butch"))) score += 5;
        if (item.category === "Seafood" && (cat.includes("seafood") || cat.includes("fish"))) score += 5;
        if (item.category === "Dairy & Eggs" && (cat.includes("dairy") || cat.includes("egg"))) score += 5;

        return { product: m, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];

      if (best) {
        // Delete existing auto-match and insert new one
        await db
          .delete(stapleProducts)
          .where(
            and(
              eq(stapleProducts.stapleId, stapleId),
              eq(stapleProducts.storeId, storeId),
              eq(stapleProducts.autoMatched, true)
            )
          );

        await db.insert(stapleProducts).values({
          stapleId,
          storeProductId: best.product.id,
          storeId,
          autoMatched: true,
        });

        console.log(`  [${storeId}] ${item.name} → ${best.product.name} ($${best.product.price})`);
      }
    }
  }

  console.log("[seed] Staple seeding complete.");
}

seedStaples().catch((e) => {
  console.error("Seeding failed:", e);
  process.exit(1);
});
