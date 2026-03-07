import { db } from "../lib/db";
import { stores } from "../lib/db/schema";

const storeData = [
  {
    id: "fosters",
    name: "Foster's Food Fair",
    website: "https://shop.fosters.ky",
    sourceType: "api",
  },
  {
    id: "hurleys",
    name: "Hurley's Marketplace",
    website: "https://hurleys.ky",
    sourceType: "playwright",
  },
  {
    id: "kirkmarket",
    name: "Kirk Market",
    website: "https://kirkmarket.ky",
    sourceType: "playwright",
  },
  {
    id: "costuless",
    name: "Cost-U-Less",
    website: "https://shopcostuless.com",
    sourceType: "playwright",
  },
  {
    id: "pricedright",
    name: "Priced Right",
    website: "https://shop.pricedright.ky",
    sourceType: "api",
  },
  {
    id: "shopright",
    name: "Shopright",
    website: "https://www.shopright.ky",
    sourceType: "playwright",
  },
];

async function seed() {
  for (const store of storeData) {
    await db
      .insert(stores)
      .values(store)
      .onConflictDoUpdate({
        target: stores.id,
        set: { name: store.name, website: store.website, sourceType: store.sourceType },
      });
  }
  console.log(`Seeded ${storeData.length} stores.`);
}

seed();
