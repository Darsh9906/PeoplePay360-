/**
 * Empties every application table.
 *
 * The app ships with no fixture data — use `npm run test:e2e` to build a real
 * dataset by driving the HTTP API, or bootstrap an admin and enter data by hand.
 */
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(databaseUrl);

// Every table the application owns. CASCADE handles the foreign keys between them.
const tables = [
  "payment_transactions",
  "payment_batches",
  "payroll_warnings",
  "payslip_lines",
  "payslips",
  "payrun_employees",
  "payruns",
  "time_off_requests",
  "leave_allocations",
  "time_off_types",
  "attendance_records",
  "contracts",
  "salary_rules",
  "salary_structures",
  "employee_working_schedules",
  "working_schedule_lines",
  "working_schedules",
  "employee_bank_accounts",
  "employees",
  "departments",
  "approvals",
  "audit_logs",
  "documents",
  "notifications",
  "email_logs",
  "invite_tokens",
  "password_reset_tokens",
  "sessions",
  "statutory_settings",
  "users",
  "organizations",
];

async function reset() {
  await sql.query(
    `TRUNCATE TABLE ${tables.map((table) => `"${table}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );

  const [{ count }] = (await sql`select count(*)::int as count from users`) as {
    count: number;
  }[];

  console.log(`Database reset. ${tables.length} tables emptied (users: ${count}).`);
  console.log("Bootstrap an admin with POST /api/auth/bootstrap, or run: npm run test:e2e");
}

await reset();
