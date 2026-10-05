CREATE TYPE "public"."ads_report_type" AS ENUM('campaigns', 'keywords', 'search_terms');--> statement-breakpoint
CREATE TYPE "public"."recommendation_status" AS ENUM('approved', 'dismissed', 'done');--> statement-breakpoint
CREATE TABLE "ads_keyword_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"import_id" uuid NOT NULL,
	"keyword" text NOT NULL,
	"match_type" text NOT NULL,
	"status" text,
	"campaign_name" text NOT NULL,
	"ad_group_name" text NOT NULL,
	"max_cpc" numeric(14, 2),
	"quality_score" integer,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"cost" numeric(14, 2) NOT NULL,
	"impressions" bigint NOT NULL,
	"clicks" bigint NOT NULL,
	"conversions" numeric(14, 2),
	"conversion_value" numeric(14, 2)
);
--> statement-breakpoint
CREATE TABLE "ads_recommendation_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"fingerprint" text NOT NULL,
	"status" "recommendation_status" NOT NULL,
	"snapshot" jsonb NOT NULL,
	"decided_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ads_search_term_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"import_id" uuid NOT NULL,
	"search_term" text NOT NULL,
	"match_type" text,
	"added_excluded" text,
	"keyword" text,
	"campaign_name" text NOT NULL,
	"ad_group_name" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"cost" numeric(14, 2) NOT NULL,
	"impressions" bigint NOT NULL,
	"clicks" bigint NOT NULL,
	"conversions" numeric(14, 2),
	"conversion_value" numeric(14, 2)
);
--> statement-breakpoint
DROP INDEX "ads_coverage_client_idx";--> statement-breakpoint
ALTER TABLE "ads_coverage" ADD COLUMN "report_type" "ads_report_type" DEFAULT 'campaigns' NOT NULL;--> statement-breakpoint
ALTER TABLE "ads_imports" ADD COLUMN "report_type" "ads_report_type" DEFAULT 'campaigns' NOT NULL;--> statement-breakpoint
ALTER TABLE "ads_keyword_metrics" ADD CONSTRAINT "ads_keyword_metrics_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ads_keyword_metrics" ADD CONSTRAINT "ads_keyword_metrics_import_id_ads_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."ads_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ads_recommendation_decisions" ADD CONSTRAINT "ads_recommendation_decisions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ads_recommendation_decisions" ADD CONSTRAINT "ads_recommendation_decisions_decided_by_id_users_id_fk" FOREIGN KEY ("decided_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ads_search_term_metrics" ADD CONSTRAINT "ads_search_term_metrics_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ads_search_term_metrics" ADD CONSTRAINT "ads_search_term_metrics_import_id_ads_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."ads_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ads_keyword_unique_idx" ON "ads_keyword_metrics" USING btree ("client_id","campaign_name","ad_group_name","keyword","match_type","period_start","period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "ads_rec_decision_idx" ON "ads_recommendation_decisions" USING btree ("client_id","fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "ads_search_term_unique_idx" ON "ads_search_term_metrics" USING btree ("client_id","campaign_name","ad_group_name","search_term","period_start","period_end");--> statement-breakpoint
CREATE INDEX "ads_coverage_client_idx" ON "ads_coverage" USING btree ("client_id","report_type","period_start");