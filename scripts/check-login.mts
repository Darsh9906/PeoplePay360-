/**
 * Read-only: explains why a given email would be accepted or rejected at
 * sign-in, checking exactly what src/app/api/auth/login/route.ts checks.
 *
 *   CHECK_EMAIL=someone@example.com CHECK_PASSWORD='DemoPass123!' npm run db:check-login
 *
 * With no CHECK_EMAIL, it lists every account instead.
 */
import { pbkdf2Sync, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
const email = process.env.CHECK_EMAIL?.trim().toLowerCase();
const password = process.env.CHECK_PASSWORD ?? "DemoPass123!";

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(databaseUrl);

function verifyPassword(value: string, storedHash: string | null) {
  if (!storedHash) return { ok: false, why: "no password hash stored" };
  const [method, iterations, salt, stored] = storedHash.split("$");
  if (method !== "pbkdf2" || !iterations || !salt || !stored) {
    return { ok: false, why: `hash is not in pbkdf2$iters$salt$hash form (got "${method}")` };
  }
  const computed = pbkdf2Sync(value, salt, Number(iterations), 64, "sha512").toString("hex");
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(stored, "hex");
  const ok = a.length === b.length && timingSafeEqual(a, b);
  return { ok, why: ok ? "" : "password does not match the stored hash" };
}

type UserRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  password_hash: string | null;
  must_change_password: boolean;
  organization_id: string | null;
  organization_name: string | null;
};

if (!email) {
  const rows = (await sql`
    select u.id, u.email, u.role, u.status, u.password_hash,
           u.must_change_password, u.organization_id, o.name as organization_name
    from users u
    left join organizations o on o.id = u.organization_id
    order by u.created_at desc
  `) as UserRow[];

  console.log(`\n${rows.length} account(s) in the database:\n`);
  for (const row of rows) {
    console.log(
      `  ${row.email.padEnd(38)} ${row.role.padEnd(16)} ${row.status.padEnd(9)} ` +
        `${row.password_hash ? "has password" : "NO PASSWORD"}  ${row.organization_name ?? "(no workspace)"}`,
    );
  }
  console.log("\nRe-run with CHECK_EMAIL=<address> to test one sign-in.\n");
} else {
  const [user] = (await sql`
    select u.id, u.email, u.role, u.status, u.password_hash,
           u.must_change_password, u.organization_id, o.name as organization_name
    from users u
    left join organizations o on o.id = u.organization_id
    where u.email = ${email}
    limit 1
  `) as UserRow[];

  console.log(`\nChecking sign-in for: ${email}\n`);

  if (!user) {
    console.log("  REJECTED — no user row with that email exists.");
    console.log("\n  The login route looks up users.email after lowercasing the input,");
    console.log("  so a missing row gives the generic \"Invalid email or password\".");
    console.log("\n  Run:  npm run db:demo:users\n");
  } else {
    const checks: [string, boolean, string][] = [];
    checks.push(["row exists", true, user.id]);
    checks.push(["status is active", user.status === "active", `status = "${user.status}"`]);

    const verified = verifyPassword(password, user.password_hash);
    checks.push(["password verifies", verified.ok, verified.why || "matches"]);
    checks.push([
      "has a workspace",
      Boolean(user.organization_id),
      user.organization_name ?? "no organization — pages will be empty",
    ]);

    for (const [label, pass, detail] of checks) {
      console.log(`  ${pass ? "ok  " : "FAIL"}  ${label.padEnd(20)} ${detail}`);
    }

    const wouldSignIn = user.status === "active" && verified.ok;
    console.log(
      `\n  => ${wouldSignIn ? "This login WOULD succeed." : "This login WOULD be rejected."}`,
    );
    if (wouldSignIn && user.must_change_password) {
      console.log("     It will land on /change-password first.");
    }
    console.log("");
  }
}
