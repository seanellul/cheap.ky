import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const stores = sqliteTable("stores", {
  id: text("id").primaryKey(), // slug: fosters, hurleys, kirkmarket, costuless
  name: text("name").notNull(),
  website: text("website").notNull(),
  sourceType: text("source_type").notNull(), // api, playwright, csv
  lastIngestedAt: integer("last_ingested_at", { mode: "timestamp" }),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const storeProducts = sqliteTable(
  "store_products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id),
    sku: text("sku").notNull(),
    upc: text("upc"),
    name: text("name").notNull(),
    brand: text("brand"),
    description: text("description"),
    price: real("price"),
    salePrice: real("sale_price"),
    unit: text("unit"),
    size: text("size"),
    categoryRaw: text("category_raw"),
    categoryId: integer("category_id").references(() => categories.id),
    imageUrl: text("image_url"),
    inStock: integer("in_stock", { mode: "boolean" }).default(true),
    sourceUrl: text("source_url"),
    rawData: text("raw_data"), // JSON blob
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("store_sku_idx").on(table.storeId, table.sku),
  ]
);

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  canonicalName: text("canonical_name").notNull(),
  brand: text("brand"),
  categoryId: integer("category_id").references(() => categories.id),
  upc: text("upc"),
  size: text("size"),
  imageUrl: text("image_url"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const productMatches = sqliteTable(
  "product_matches",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    storeProductId: integer("store_product_id")
      .notNull()
      .references(() => storeProducts.id),
    matchMethod: text("match_method").notNull(), // upc, fuzzy_name, manual, ai
    confidence: real("confidence").notNull().default(1.0),
    verified: integer("verified", { mode: "boolean" }).default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("match_store_product_idx").on(table.storeProductId),
  ]
);

export const priceHistory = sqliteTable("price_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storeProductId: integer("store_product_id")
    .notNull()
    .references(() => storeProducts.id),
  price: real("price"),
  salePrice: real("sale_price"),
  recordedAt: integer("recorded_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const cartItems = sqliteTable("cart_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  preferredStoreId: text("preferred_store_id").references(() => stores.id),
  notes: text("notes"),
});

export const smartCartItems = sqliteTable("smart_cart_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stapleId: integer("staple_id")
    .notNull()
    .references(() => staples.id)
    .unique(),
  quantity: integer("quantity").notNull().default(1),
});

export const shoppingLists = sqliteTable("shopping_lists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const shoppingListItems = sqliteTable("shopping_list_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  listId: integer("list_id")
    .notNull()
    .references(() => shoppingLists.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
});

// Curated staple/commodity items for cross-store comparison
export const staples = sqliteTable("staples", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), // e.g. "Chicken Wings (Fresh)"
  category: text("category").notNull(), // e.g. "Meat & Poultry"
  keywords: text("keywords").notNull(), // JSON array of search terms
  sortOrder: integer("sort_order").notNull().default(0),
});

// Links a staple to the best representative product at each store
export const stapleProducts = sqliteTable(
  "staple_products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    stapleId: integer("staple_id")
      .notNull()
      .references(() => staples.id),
    storeProductId: integer("store_product_id")
      .notNull()
      .references(() => storeProducts.id),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id),
    autoMatched: integer("auto_matched", { mode: "boolean" }).default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("staple_store_idx").on(table.stapleId, table.storeId),
  ]
);
