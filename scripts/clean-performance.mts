/**
 * PEOPLEPAY360 — PERFORMANCE TEST DATASET CLEANUP
 *
 * SAFELY AND ISOLATEDLY removes data belonging ONLY to the dedicated
 * "PeoplePay360 Performance Test" organization (slug: peoplepay360-performance-test).
 *
 * NEVER modifies, deletes, or touches any other organization or user data.
 *
 * Usage:
 *   pnpm db:clean:performance
 *   npm run db:clean:performance
 */

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const sql = neon(databaseUrl);
const PERF_ORG_SLUG = "peoplepay360-performance-test";

export async function cleanPerformance() {
  console.log("==================================================");
  console.log("PEOPLEPAY360 PERFORMANCE DATA CLEANUP");
  console.log("==================================================");

  const [org] = (await sql`
    select id, name from organizations where slug = ${PERF_ORG_SLUG} limit 1
  `) as { id: string; name: string }[];

  if (!org) {
    console.log(`Organization '${PERF_ORG_SLUG}' does not exist. Nothing to clean.`);
    return;
  }

  const orgId = org.id;
  console.log(`Targeting organization for cleanup: ${org.name} (${orgId})`);

  console.log("Deleting dependent performance test data in foreign-key order...");

  // Delete dependent rows by organization reference
  await sql`delete from audit_logs where actor_user_id in (select id from users where organization_id = ${orgId})`;
  await sql`delete from email_logs where user_id in (select id from users where organization_id = ${orgId})`;
  await sql`delete from notifications where user_id in (select id from users where organization_id = ${orgId})`;
  await sql`delete from approvals where requested_by in (select id from users where organization_id = ${orgId})`;
  await sql`delete from documents where entity_id in (select id from employees where organization_id = ${orgId})`;

  await sql`delete from payment_transactions where batch_id in (select pb.id from payment_batches pb join payruns p on p.id = pb.payrun_id where p.organization_id = ${orgId})`;
  await sql`delete from payment_batches where payrun_id in (select id from payruns where organization_id = ${orgId})`;
  await sql`delete from employee_bank_accounts where employee_id in (select id from employees where organization_id = ${orgId})`;

  await sql`delete from payroll_warnings where payrun_id in (select id from payruns where organization_id = ${orgId})`;
  await sql`delete from payslip_lines where payslip_id in (select ps.id from payslips ps join payruns p on p.id = ps.payrun_id where p.organization_id = ${orgId})`;
  await sql`delete from payslips where payrun_id in (select id from payruns where organization_id = ${orgId})`;
  await sql`delete from payrun_employees where payrun_id in (select id from payruns where organization_id = ${orgId})`;
  await sql`delete from payruns where organization_id = ${orgId}`;

  await sql`delete from salary_rules where structure_id in (select id from salary_structures where organization_id = ${orgId})`;
  await sql`delete from salary_structures where organization_id = ${orgId}`;

  await sql`delete from time_off_requests where employee_id in (select id from employees where organization_id = ${orgId})`;
  await sql`delete from leave_allocations where time_off_type_id in (select id from time_off_types where organization_id = ${orgId})`;
  await sql`delete from time_off_types where organization_id = ${orgId}`;

  await sql`delete from attendance_records where employee_id in (select id from employees where organization_id = ${orgId})`;
  await sql`delete from contracts where employee_id in (select id from employees where organization_id = ${orgId})`;
  await sql`delete from employee_working_schedules where employee_id in (select id from employees where organization_id = ${orgId})`;

  await sql`delete from working_schedule_lines where schedule_id in (select id from working_schedules where organization_id = ${orgId})`;
  await sql`delete from working_schedules where organization_id = ${orgId}`;

  await sql`delete from employees where organization_id = ${orgId}`;
  await sql`delete from departments where organization_id = ${orgId}`;

  await sql`delete from sessions where user_id in (select id from users where organization_id = ${orgId})`;
  await sql`delete from invite_tokens where user_id in (select id from users where organization_id = ${orgId})`;
  await sql`delete from password_reset_tokens where user_id in (select id from users where organization_id = ${orgId})`;
  await sql`delete from users where organization_id = ${orgId}`;

  await sql`delete from organizations where id = ${orgId}`;

  console.log(`\nCleanup complete. All performance data for organization '${PERF_ORG_SLUG}' deleted successfully.\n`);
}

cleanPerformance().catch((err) => {
  console.error("Cleanup Error:", err);
  process.exit(1);
});
