/**
 * Applies database migrations. Plain JavaScript so it runs in production
 * with only runtime dependencies. Usage:
 *   npm run db:migrate            # uses DATABASE_URL
 *   npm run db:migrate -- --reset # also empties all data (test databases only)
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import pg from "pg";

try {
  await import("dotenv/config"); // local development only
} catch {}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: url });
try {
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "./drizzle" });
  if (process.argv.includes("--reset")) {
    if (!/_(test|e2e)$/.test(new URL(url).pathname)) {
      throw new Error("Refusing to --reset a database whose name doesn't end in _test or _e2e");
    }
    await db.execute(
      sql`truncate table agencies, users, sessions, clients, audit_log, ads_imports, ads_campaign_metrics, ads_coverage, ads_keyword_metrics, ads_search_term_metrics, ads_recommendation_decisions, leads cascade`,
    );
  }
  console.log("Migrations applied.");
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await pool.end();
}
