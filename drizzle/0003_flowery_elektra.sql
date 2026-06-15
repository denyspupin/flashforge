CREATE TABLE "prompt_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"version" integer NOT NULL,
	"body" text NOT NULL,
	"description" varchar(256),
	"changelog" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_by_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prompt_templates" ADD CONSTRAINT "prompt_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_templates_slug_version_idx" ON "prompt_templates" USING btree ("slug","version") WHERE "prompt_templates"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_templates_active_slug_idx" ON "prompt_templates" USING btree ("slug") WHERE "prompt_templates"."is_active" = true AND "prompt_templates"."deleted_at" IS NULL;