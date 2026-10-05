CREATE TABLE "ads_campaign_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"import_id" uuid NOT NULL,
	"campaign_name" text NOT NULL,
	"campaign_status" text,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"currency" text,
	"budget" numeric(14, 2),
	"cost" numeric(14, 2) NOT NULL,
	"impressions" bigint NOT NULL,
	"clicks" bigint NOT NULL,
	"conversions" numeric(14, 2),
	"conversion_value" numeric(14, 2),
	"search_impression_share" numeric(6, 4)
);
--> statement-breakpoint
CREATE TABLE "ads_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" uuid,
	"filename" text NOT NULL,
	"row_count" integer NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"daily" boolean NOT NULL,
	"currency" text,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ads_campaign_metrics" ADD CONSTRAINT "ads_campaign_metrics_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ads_campaign_metrics" ADD CONSTRAINT "ads_campaign_metrics_import_id_ads_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."ads_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ads_imports" ADD CONSTRAINT "ads_imports_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ads_imports" ADD CONSTRAINT "ads_imports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ads_metrics_unique_idx" ON "ads_campaign_metrics" USING btree ("client_id","campaign_name","period_start","period_end");--> statement-breakpoint
CREATE INDEX "ads_metrics_range_idx" ON "ads_campaign_metrics" USING btree ("client_id","period_start","period_end");--> statement-breakpoint
CREATE INDEX "ads_imports_client_idx" ON "ads_imports" USING btree ("client_id","created_at");