CREATE TABLE IF NOT EXISTS "email_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"verified" boolean DEFAULT false,
	"unsubscribe_token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_subscribers_email_idx" ON "email_subscribers" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_subscribers_token_idx" ON "email_subscribers" USING btree ("unsubscribe_token");
