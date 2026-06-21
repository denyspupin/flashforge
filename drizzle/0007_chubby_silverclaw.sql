ALTER TYPE "public"."notification_type" ADD VALUE 'collection_fork_received';--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "visibility" "visibility" DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "is_curated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "forked_from_collection_id" uuid;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_forked_from_collection_id_collections_id_fk" FOREIGN KEY ("forked_from_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;