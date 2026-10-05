CREATE TABLE "ad_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"created_by_id" uuid,
	"focus" text NOT NULL,
	"instructions" text,
	"model" text NOT NULL,
	"facts" jsonb NOT NULL,
	"items" jsonb NOT NULL,
	"writer_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ad_drafts" ADD CONSTRAINT "ad_drafts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_drafts" ADD CONSTRAINT "ad_drafts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_drafts_client_idx" ON "ad_drafts" USING btree ("client_id","created_at");