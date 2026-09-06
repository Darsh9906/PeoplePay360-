/**
 * Creates one demo login per role in the seeded workspace, so each role can be
 * demonstrated. Safe to re-run: users are upserted by email, and no employee,
 * payroll or attendance data is touched.
 *
 *   npm run db:demo:users
 *
 * Target workspace: SEED_ADMIN_EMAIL picks it by that admin's organization.
 * Without it, the organization holding the most employees is used.
 */
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
const password = process.env.SEED_USER_PASSWORD ?? "DemoPass123!";
const adminEmail = process.env.SEED_ADMIN_EMAIL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(databaseUrl);

/** Same pbkdf2 format as src/app/api/_lib/auth.ts, so these logins work. */
function hashPassword(value: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(value, salt, 120_000, 64, "sha512").toString("hex");
  return `pbkdf2$120000$${salt}$${hash}`;
}

/** Mirrors src/app/api/_lib/auth.ts, so we can prove the stored hash works. */
function verifyPassword(value: string, storedHash: string | null) {
  if (!storedHash) return false;
  const [method, iterations, salt, stored] = storedHash.split("$");
  if (method !== "pbkdf2" || !iterations || !salt || !stored) return false;
  const computed = pbkdf2Sync(value, salt, Number(iterations), 64, "sha512").toString("hex");
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(stored, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

const roles = [
  {
    role: "hr_manager",
    name: "Harper HR",
    email: "hr.manager@demo.peoplepay360.test",
    sees: "Dashboard, Employees, Contracts, Schedules, Attendance, Time Off",
  },
  {
    role: "payroll_user",
    name: "Priya Payroll",
    email: "payroll.user@demo.peoplepay360.test",
    sees: "Everything HR sees, plus Payruns and Payslips",
  },
  {
    role: "payroll_manager",
    name: "Manav Payroll",
    email: "payroll.manager@demo.peoplepay360.test",
    sees: "Adds Salary Structures, Salary Rules, Payroll Health, Anomalies",
  },
  {
    role: "employee",
    name: "Evan Employee",
    email: "employee@demo.peoplepay360.test",
    sees: "My Profile, My Attendance, My Time Off only",
  },
] as const;

type OrgRow = { id: string; name: string; employees: number };

async function resolveOrganization(): Promise<OrgRow> {
  if (adminEmail) {
    const [row] = (await sql`
      select o.id, o.name,
             (select count(*) from employees e where e.organization_id = o.id)::int as employees
      from users u
      join organizations o on o.id = u.organization_id
      where u.email = ${adminEmail}
      limit 1
    `) as OrgRow[];

    if (!row) {
      throw new Error(
        `No user with email "${adminEmail}" and an organization was found.`,
      );
    }
    return row;
  }

  const [row] = (await sql`
    select o.id, o.name,
           (select count(*) from employees e where e.organization_id = o.id)::int as employees
    from organizations o
    order by employees desc, o.created_at desc
    limit 1
  `) as OrgRow[];

  if (!row) {
    throw new Error("No organizations exist. Run `npm run db:seed:demo` first.");
  }
  return row;
}

const organization = await resolveOrganization();

console.log(`\nWorkspace: ${organization.name} (${organization.employees} employees)\n`);

for (const entry of roles) {
  await sql`
    insert into users (
      organization_id, name, email, role, status, password_hash,
      must_change_password, email_verified_at, password_changed_at
    )
    values (
      ${organization.id}, ${entry.name}, ${entry.email}, ${entry.role}::user_role,
      'active', ${hashPassword(password)}, false, now(), now()
    )
    on conflict (email) do update set
      organization_id = excluded.organization_id,
      name = excluded.name,
      role = excluded.role,
      status = 'active',
      password_hash = excluded.password_hash,
      must_change_password = false,
      password_changed_at = now()
  `;
}

/**
 * The employee role is scoped through employees.user_id — an employee login
 * that is not linked to an employee record sees nothing at all. Link it to a
 * real seeded employee so the self-service pages have something to show.
 */
const [employeeUser] = (await sql`
  select id from users where email = ${"employee@demo.peoplepay360.test"} limit 1
`) as { id: string }[];

// Drop any previous link, then attach the first active employee.
await sql`
  update employees set user_id = null
  where user_id = ${employeeUser.id}
`;

const [linked] = (await sql`
  update employees
  set user_id = ${employeeUser.id}
  where id = (
    select id from employees
    where organization_id = ${organization.id}
      and status = 'active'
      and user_id is null
    order by employee_code
    limit 1
  )
  returning employee_code, first_name, last_name
`) as { employee_code: string; first_name: string; last_name: string }[];

// Read back and verify exactly what the login route checks: the row exists,
// status is active, and the stored hash validates this password. A silent
// mismatch here is what "Invalid email or password" looks like from outside.
const checks = (await sql`
  select email, role, status, password_hash, organization_id
  from users
  where email = any(${roles.map((r) => r.email)}::text[])
`) as {
  email: string;
  role: string;
  status: string;
  password_hash: string | null;
  organization_id: string | null;
}[];

let allGood = checks.length === roles.length;
console.log("Verifying each login the way /api/auth/login does:\n");

for (const entry of roles) {
  const row = checks.find((c) => c.email === entry.email);
  if (!row) {
    console.log(`  FAIL  ${entry.email} — row was not written`);
    allGood = false;
    continue;
  }
  const problems: string[] = [];
  if (row.status !== "active") problems.push(`status is "${row.status}"`);
  if (!verifyPassword(password, row.password_hash)) problems.push("password does not verify");
  if (row.organization_id !== organization.id) problems.push("wrong organization");
  if (row.email !== row.email.toLowerCase()) problems.push("email is not lowercase");

  if (problems.length > 0) {
    console.log(`  FAIL  ${entry.email} — ${problems.join(", ")}`);
    allGood = false;
  } else {
    console.log(`  ok    ${entry.email}`);
  }
}
console.log("");

if (!allGood) {
  throw new Error("At least one demo login would be rejected at sign-in.");
}

const rows = (await sql`
  select email, role from users
  where organization_id = ${organization.id}
  order by case role
    when 'admin' then 1 when 'payroll_manager' then 2
    when 'payroll_user' then 3 when 'hr_manager' then 4 else 5 end
`) as { email: string; role: string }[];

console.log("Demo logins (all use the same password):\n");
for (const entry of roles) {
  console.log(`  ${entry.role}`);
  console.log(`    email     ${entry.email}`);
  console.log(`    password  ${password}`);
  console.log(`    sees      ${entry.sees}`);
  console.log("");
}

if (linked) {
  // The navbar shows users.name while My Profile shows the linked employee
  // record. Leaving them different makes one person look like two, so the
  // login takes the employee's name.
  const employeeName = `${linked.first_name} ${linked.last_name}`;
  await sql`update users set name = ${employeeName} where id = ${employeeUser.id}`;

  console.log(
    `Employee login is linked to ${employeeName} (${linked.employee_code}),\n` +
      `and the account name now matches it.\n`,
  );

  // What that employee can actually show on their self-service pages.
  const [own] = (await sql`
    select
      (select count(*) from attendance_records a
        where a.employee_id = e.id)::int as attendance,
      (select count(*) from leave_allocations l
        where l.employee_id = e.id)::int as allocations,
      (select count(*) from time_off_requests t
        where t.employee_id = e.id)::int as time_off,
      (select count(*) from payslips p
        where p.employee_id = e.id)::int as payslips,
      (select count(*) from contracts c
        where c.employee_id = e.id)::int as contracts
    from employees e where e.id = (
      select id from employees where user_id = ${employeeUser.id} limit 1
    )
  `) as Record<string, number>[];

  console.log("That employee's own records:");
  console.log(`  attendance   ${own.attendance}`);
  console.log(`  contracts    ${own.contracts}`);
  console.log(`  allocations  ${own.allocations}`);
  console.log(`  time off     ${own.time_off}`);
  console.log(`  payslips     ${own.payslips}`);
  if (own.attendance === 0) {
    console.log("\n  Note: this employee has no attendance rows, so My Attendance");
    console.log("  will be empty until they check in.");
  }
  console.log("");
} else {
  console.log(
    "Warning: no unlinked active employee was available, so the employee login\n" +
      "has no employee record and its self-service pages will be empty.\n",
  );
}

console.log(`Accounts in this workspace: ${rows.length}`);
for (const row of rows) {
  console.log(`  ${row.role.padEnd(16)} ${row.email}`);
}
console.log("");
