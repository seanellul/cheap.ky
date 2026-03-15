ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "is_promo" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "promo_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "price_history" ADD COLUMN IF NOT EXISTS "is_promo" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "price_history" ADD COLUMN IF NOT EXISTS "promo_ends_at" timestamp;
