/**
 * Applies the SQL files in ./drizzle over the neon-http driver.
 *
 * `drizzle-kit migrate` wraps every migration in a transaction, which the
 * serverless HTTP driver cannot open, so it hangs. This runner sends each
 * statement on its own and records what it applied in drizzle.__drizzle_migrations
 * so the two stay in sync.
 */
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(databaseUrl);
const migrationsDir = join(process.cwd(), "drizzle");

/** Errors that mean "this statement was already applied" rather than a real failure. */
function isAlreadyApplied(message: string) {
  return (
    message.includes("already exists") ||
    message.includes("duplicate_object") ||
    message.includes("duplicate key value")
  );
}

async function run() {
  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `;

  const applied = await sql`SELECT hash FROM drizzle.__drizzle_migrations`;
  const appliedHashes = new Set(applied.map((row) => row.hash as string));

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql") && /^\d{4}_/.test(file))
    .sort();

  for (const file of files) {
    const contents = await readFile(join(migrationsDir, file), "utf8");
    const hash = createHash("sha256").update(contents).digest("hex");

    if (appliedHashes.has(hash)) {
      console.log(`- ${file} (already applied)`);
      continue;
    }

    const statements = contents
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);

    let skipped = 0;

    for (const statement of statements) {
      try {
        await sql.query(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (!isAlreadyApplied(message)) {
          console.error(`\nFailed in ${file}:\n${statement}\n`);
          throw error;
        }

        skipped += 1;
      }
    }

    await sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${hash}, ${Date.now()})
    `;

    const suffix = skipped ? ` (${skipped} statement(s) already present)` : "";
    console.log(`✓ ${file}${suffix}`);
  }

  console.log("\nMigrations up to date.");
}

await run();
