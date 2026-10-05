CREATE TYPE "public"."lead_channel" AS ENUM('call', 'whatsapp', 'form', 'email', 'walk_in', 'other');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('google_ads', 'google_search', 'google_maps', 'referral', 'social', 'direct', 'other', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'quoted', 'won', 'lost');--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"channel" "lead_channel" NOT NULL,
	"source" "lead_source" DEFAULT 'unknown' NOT NULL,
	"service" text,
	"location" text,
	"notes" text,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"value" numeric(14, 2),
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_client_received_idx" ON "leads" USING btree ("client_id","received_at");