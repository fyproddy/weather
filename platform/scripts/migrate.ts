/**
 * Applies database migrations. Usage:
 *   npm run db:migrate            # uses DATABASE_URL
 *   npm run db:migrate -- --reset # also empties all data (tests only)
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "./drizzle" });
  if (process.argv.includes("--reset")) {
    if (!/_(test|e2e)$/.test(new URL(url).pathname)) {
      throw new Error("Refusing to --reset a database whose name doesn't end in _test or _e2e");
    }
    await db.execute(sql`truncate table agencies, users, sessions, clients, audit_log, ads_imports, ads_campaign_metrics, ads_coverage, ads_keyword_metrics, ads_search_term_metrics, ads_recommendation_decisions cascade`);
  }
  await pool.end();
  console.log("Migrations applied.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
