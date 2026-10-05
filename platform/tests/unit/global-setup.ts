import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

export default async function setup() {
  const pool = new Pool({
    connectionString:
      process.env.TEST_DATABASE_URL ?? "postgresql://growth:growth@localhost:5432/growth_test",
  });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
}
