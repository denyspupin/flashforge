ALTER TABLE "collections" ADD COLUMN "share_token" varchar(32);--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "share_token" varchar(32);--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_share_token_unique" UNIQUE("share_token");--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_share_token_unique" UNIQUE("share_token");