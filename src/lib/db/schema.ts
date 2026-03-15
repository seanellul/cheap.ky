import { pgTable, text, integer, serial, real, uniqueIndex, boolean, timestamp } from "drizzle-orm/pg-core";

export const stores = pgTable("stores", {
  id: text("id").primaryKey(), // slug: fosters, hurleys, kirkmarket, costuless
  name: text("name").notNull(),
  website: text("website").notNull(),
  sourceType: text("source_type").notNull(), // api, playwright, csv
  lastIngestedAt: timestamp("last_ingested_at"),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const storeProducts = pgTable(
  "store_products",
  {
    id: serial("id").primaryKey(),
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
    inStock: boolean("in_stock").default(true),
    sourceUrl: text("source_url"),
    unitSize: real("unit_size"),   // parsed numeric size (e.g. 500 for "500ml", 4260 for "12x355ml")
    unitType: text("unit_type"),   // canonical unit: g, ml, oz, fl_oz, ea
    rawData: text("raw_data"), // JSON blob
    createdAt: timestamp("created_at")
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("store_sku_idx").on(table.storeId, table.sku),
  ]
);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  canonicalName: text("canonical_name").notNull(),
  brand: text("brand"),
  categoryId: integer("category_id").references(() => categories.id),
  upc: text("upc"),
  size: text("size"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
});

export const productMatches = pgTable(
  "product_matches",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    storeProductId: integer("store_product_id")
      .notNull()
      .references(() => storeProducts.id),
    matchMethod: text("match_method").notNull(), // upc, fuzzy_name, manual, ai
    confidence: real("confidence").notNull().default(1.0),
    verified: boolean("verified").default(false),
    createdAt: timestamp("created_at")
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("match_store_product_idx").on(table.storeProductId),
  ]
);

export const priceHistory = pgTable("price_history", {
  id: serial("id").primaryKey(),
  storeProductId: integer("store_product_id")
    .notNull()
    .references(() => storeProducts.id),
  price: real("price"),
  salePrice: real("sale_price"),
  recordedAt: timestamp("recorded_at")
    .notNull()
    .defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  preferredStoreId: text("preferred_store_id").references(() => stores.id),
  notes: text("notes"),
});

export const smartCartItems = pgTable("smart_cart_items", {
  id: serial("id").primaryKey(),
  stapleId: integer("staple_id")
    .notNull()
    .references(() => staples.id)
    .unique(),
  quantity: integer("quantity").notNull().default(1),
});

export const shoppingLists = pgTable("shopping_lists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow(),
});

export const shoppingListItems = pgTable("shopping_list_items", {
  id: serial("id").primaryKey(),
  listId: integer("list_id")
    .notNull()
    .references(() => shoppingLists.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
});

// Blog posts (programmatically generated from price data)
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(), // meta description
  content: text("content").notNull(), // HTML content
  category: text("category").notNull(), // weekly-report, price-gaps, store-comparison, category-spotlight, etc.
  tags: text("tags"), // JSON array
  coverImage: text("cover_image"),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  dataSnapshot: text("data_snapshot"), // JSON blob of data used to generate the article (for regeneration)
});

// Public analytics events (no PII stored)
export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // search, product_view, compare_view, page_view
  data: text("data"), // search query, product slug, etc.
  productId: integer("product_id"),
  resultCount: integer("result_count"), // for searches: how many results returned
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Daily aggregated stats (rolled up from events for fast queries)
export const analyticsDailyStats = pgTable(
  "analytics_daily_stats",
  {
    id: serial("id").primaryKey(),
    date: text("date").notNull(), // YYYY-MM-DD
    totalSearches: integer("total_searches").notNull().default(0),
    uniqueQueries: integer("unique_queries").notNull().default(0),
    productViews: integer("product_views").notNull().default(0),
    compareViews: integer("compare_views").notNull().default(0),
    pageViews: integer("page_views").notNull().default(0),
  },
  (table) => [uniqueIndex("daily_stats_date_idx").on(table.date)]
);

// Curated staple/commodity items for cross-store comparison
export const staples = pgTable("staples", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g. "Chicken Wings (Fresh)"
  category: text("category").notNull(), // e.g. "Meat & Poultry"
  keywords: text("keywords").notNull(), // JSON array of search terms
  sortOrder: integer("sort_order").notNull().default(0),
});

// User-submitted product requests (wishlist for future scraping targets)
export const productRequests = pgTable("product_requests", {
  id: serial("id").primaryKey(),
  productName: text("product_name").notNull(),
  userAgent: text("user_agent"),
  status: text("status").notNull().default("pending"), // pending, noted, added
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Links a staple to the best representative product at each store
export const stapleProducts = pgTable(
  "staple_products",
  {
    id: serial("id").primaryKey(),
    stapleId: integer("staple_id")
      .notNull()
      .references(() => staples.id),
    storeProductId: integer("store_product_id")
      .notNull()
      .references(() => storeProducts.id),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id),
    autoMatched: boolean("auto_matched").default(true),
    createdAt: timestamp("created_at")
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("staple_store_idx").on(table.stapleId, table.storeId),
  ]
);

// Community product ratings (thumbs up/down per product per store)
export const productRatings = pgTable(
  "product_ratings",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id),
    rating: integer("rating").notNull(), // 1 or -1
    fingerprint: text("fingerprint").notNull(), // SHA-256(IP + User-Agent)
    createdAt: timestamp("created_at")
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("rating_product_store_fingerprint_idx").on(
      table.productId,
      table.storeId,
      table.fingerprint
    ),
  ]
);
