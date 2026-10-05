CREATE TABLE "ads_coverage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"import_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"daily" boolean NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ads_coverage" ADD CONSTRAINT "ads_coverage_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ads_coverage" ADD CONSTRAINT "ads_coverage_import_id_ads_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."ads_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ads_coverage_client_idx" ON "ads_coverage" USING btree ("client_id","period_start");