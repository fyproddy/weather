CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"created_by_id" uuid,
	"title" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"data" jsonb NOT NULL,
	"summary" text,
	"share_token" text,
	"shared_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reports_client_idx" ON "reports" USING btree ("client_id","period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_share_token_idx" ON "reports" USING btree ("share_token");