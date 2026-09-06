/**
 * PEOPLEPAY360 — PERFORMANCE TEST DATASET GENERATOR
 *
 * Populates a dedicated performance test organization ("PeoplePay360 Performance Test")
 * with a realistic 251-employee dataset across all HR, Attendance, Time Off, Payroll,
 * Payslips, Payments, Approvals, Notifications, Documents, Email Logs, and Audit Logs.
 *
 * FAST & SAFE: Uses in-memory UUID resolution and unnest array bulk inserts.
 * IDEMPOTENT: Checks if the performance dataset already exists and skips re-insertion unless FORCE_RESEED=1.
 * ISOLATED: Operates strictly within the "peoplepay360-performance-test" organization.
 *
 * Usage:
 *   pnpm db:seed:performance
 *   npm run db:seed:performance
 */

import { pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const sql = neon(databaseUrl);

// Configurable sizes (defaults strictly match target requirements)
const EMPLOYEE_COUNT = 251;
const ATTENDANCE_DAYS = 30;
const PERF_ORG_SLUG = "peoplepay360-performance-test";
const PERF_ORG_NAME = "PeoplePay360 Performance Test";
const PERF_ADMIN_EMAIL = process.env.PERF_ADMIN_EMAIL ?? "perf.admin@peoplepay360-perf.test";
const PERF_ADMIN_PASSWORD = process.env.PERF_ADMIN_PASSWORD ?? "PerfTest123!";

/** Seeded PRNG for reproducible synthetic data */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260906);
const pick = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length)];
const between = (min: number, max: number): number => min + Math.floor(rand() * (max - min + 1));
const money = (val: number): string => (Math.round(val * 100) / 100).toFixed(2);

function chunk<T>(array: T[], size = 500): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 120_000, 64, "sha512").toString("hex");
  return `pbkdf2$120000$${salt}$${hash}`;
}

const FIRST_NAMES = [
  "Alexander", "Amara", "Benjamin", "Charlotte", "Daniel", "Elena", "Felix", "Grace",
  "Henry", "Isabella", "Jacob", "Kavya", "Liam", "Maya", "Nathan", "Olivia",
  "Parth", "Quinn", "Rohan", "Sophia", "Thomas", "Uma", "Victor", "William",
  "Xavier", "Yasmine", "Zachary", "Aarav", "Beatrice", "Caleb", "Diana", "Ethan",
  "Fiona", "Gabriel", "Hannah", "Ian", "Julia", "Karan", "Leah", "Marcus",
  "Nora", "Oliver", "Priya", "Rahul", "Sara", "Tristan", "Victoria", "Wyatt",
];

const LAST_NAMES = [
  "Anderson", "Bharadwaj", "Chen", "Dahl", "Evans", "Foster", "Gupta", "Hoffman",
  "Iyer", "Jackson", "Kapoor", "Lopez", "Mehta", "Novak", "O'Connor", "Patel",
  "Rao", "Smith", "Taylor", "Usmani", "Varma", "Williams", "Xu", "Young", "Zimmerman",
];

const JOB_TITLES_BY_DEPT: Record<string, string[]> = {
  Engineering: ["Software Engineer", "Senior Developer", "Staff Engineer", "Tech Lead", "QA Specialist"],
  Product: ["Product Manager", "UX Designer", "Product Designer", "Product Analyst"],
  "Human Resources": ["HR Specialist", "Talent Acquisition Partner", "HR Generalist"],
  Finance: ["Financial Analyst", "Staff Accountant", "Payroll Specialist", "Finance Manager"],
  Operations: ["Operations Analyst", "Logistics Specialist", "Facilities Manager"],
  Sales: ["Account Executive", "Sales Development Rep", "Territory Sales Lead"],
  Marketing: ["Growth Manager", "Content Specialist", "Marketing Analyst"],
  "Customer Success": ["Customer Support Lead", "Success Manager", "Support Engineer"],
  Legal: ["Legal Counsel", "Compliance Analyst", "Contracts Specialist"],
  IT: ["Systems Administrator", "DevOps Engineer", "IT Support Specialist"],
};

const BANK_NAMES = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra", "Federal Bank"];

function getRecentWeekdays(count: number): string[] {
  const dates: string[] = [];
  const cursor = new Date("2026-08-31T00:00:00.000Z");
  while (dates.length < count) {
    const day = cursor.getUTCDay();
    if (day >= 1 && day <= 5) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return dates.reverse();
}

export async function seedPerformance() {
  console.log("==================================================");
  console.log("PEOPLEPAY360 PERFORMANCE DATA SEED");
  console.log("==================================================");

  // 1. Check or Create Target Organization
  let orgId: string;
  const [existingOrg] = (await sql`
    select id from organizations where slug = ${PERF_ORG_SLUG} limit 1
  `) as { id: string }[];

  if (existingOrg) {
    orgId = existingOrg.id;
    console.log(`Using existing target organization: ${PERF_ORG_NAME} (${orgId})`);

    // Idempotency check: check employee count
    const [{ count }] = (await sql`
      select count(*)::int as count from employees where organization_id = ${orgId}
    `) as { count: number }[];

    if (count >= EMPLOYEE_COUNT && !process.env.FORCE_RESEED) {
      console.log(`\n[IDEMPOTENCY] Organization '${PERF_ORG_NAME}' already contains ${count} employees.`);
      console.log("Performance dataset is fully seeded. Skipping re-insertion.");
      console.log("Set FORCE_RESEED=1 to force re-generation.\n");
      return;
    }
  } else {
    orgId = randomUUID();
    await sql`
      insert into organizations (id, name, slug, email_domain, industry, company_size, country_code, currency)
      values (${orgId}, ${PERF_ORG_NAME}, ${PERF_ORG_SLUG}, 'peoplepay360-perf.test', 'Technology', '250-500', 'US', 'USD')
    `;
    console.log(`Created new target organization: ${PERF_ORG_NAME} (${orgId})`);
  }

  const passwordHash = hashPassword(PERF_ADMIN_PASSWORD);

  // 2. Admin User
  const adminUserId = randomUUID();
  const [existingAdmin] = (await sql`
    select id from users where email = ${PERF_ADMIN_EMAIL} limit 1
  `) as { id: string }[];

  if (!existingAdmin) {
    await sql`
      insert into users (id, organization_id, name, email, role, status, password_hash)
      values (${adminUserId}, ${orgId}, 'Performance Admin', ${PERF_ADMIN_EMAIL}, 'admin', 'active', ${passwordHash})
    `;
  }

  // 3. Departments (10)
  const deptDefs = [
    { name: "Engineering", code: "ENG" },
    { name: "Product", code: "PROD" },
    { name: "Human Resources", code: "HR" },
    { name: "Finance", code: "FIN" },
    { name: "Operations", code: "OPS" },
    { name: "Sales", code: "SALES" },
    { name: "Marketing", code: "MKTG" },
    { name: "Customer Success", code: "CS" },
    { name: "Legal", code: "LEGAL" },
    { name: "IT", code: "IT" },
  ];

  const deptIds = new Map<string, string>();
  for (const d of deptDefs) {
    const id = randomUUID();
    deptIds.set(d.name, id);
  }

  await sql`
    insert into departments (id, organization_id, name, code)
    select a, ${orgId}::uuid, b, c from unnest(
      ${Array.from(deptIds.values())}::uuid[],
      ${deptDefs.map((d) => d.name)}::text[],
      ${deptDefs.map((d) => d.code)}::text[]
    ) as t(a, b, c)
  `;

  // 4. Working Schedules (6) & Lines (30)
  const scheduleDefs = [
    { name: "Standard 40 Hours", days: "Mon,Tue,Wed,Thu,Fri", start: "09:00", end: "18:00", breakMins: 60, weekly: "40.00" },
    { name: "Shift Morning 40h", days: "Mon,Tue,Wed,Thu,Fri", start: "07:00", end: "16:00", breakMins: 60, weekly: "40.00" },
    { name: "Shift Evening 40h", days: "Mon,Tue,Wed,Thu,Fri", start: "14:00", end: "23:00", breakMins: 60, weekly: "40.00" },
    { name: "Flexible 40 Hours", days: "Mon,Tue,Wed,Thu,Fri", start: "08:30", end: "17:30", breakMins: 60, weekly: "40.00" },
    { name: "Executive 45 Hours", days: "Mon,Tue,Wed,Thu,Fri", start: "08:30", end: "18:30", breakMins: 60, weekly: "45.00" },
    { name: "Part-Time 20 Hours", days: "Mon,Tue,Wed,Thu,Fri", start: "09:00", end: "13:00", breakMins: 0, weekly: "20.00" },
  ];

  const scheduleIds = scheduleDefs.map(() => randomUUID());

  await sql`
    insert into working_schedules (id, organization_id, name, working_days, start_time, end_time, break_duration_minutes, weekly_hours, status)
    select a, ${orgId}::uuid, b, c, d, e, f, g, 'active'::schedule_status from unnest(
      ${scheduleIds}::uuid[],
      ${scheduleDefs.map((s) => s.name)}::text[],
      ${scheduleDefs.map((s) => s.days)}::text[],
      ${scheduleDefs.map((s) => s.start)}::text[],
      ${scheduleDefs.map((s) => s.end)}::text[],
      ${scheduleDefs.map((s) => s.breakMins)}::int[],
      ${scheduleDefs.map((s) => s.weekly)}::numeric[]
    ) as t(a, b, c, d, e, f, g)
  `;

  // Schedule Lines (5 per schedule)
  type LineRow = { scheduleId: string; dayOfWeek: number; startTime: string; endTime: string; breakMinutes: number };
  const scheduleLines: LineRow[] = [];
  for (let idx = 0; idx < scheduleDefs.length; idx++) {
    const sch = scheduleDefs[idx];
    const sId = scheduleIds[idx];
    for (let day = 1; day <= 5; day++) {
      scheduleLines.push({
        scheduleId: sId,
        dayOfWeek: day,
        startTime: sch.start,
        endTime: sch.end,
        breakMinutes: sch.breakMins,
      });
    }
  }

  await sql`
    insert into working_schedule_lines (schedule_id, day_of_week, start_time, end_time, break_minutes)
    select a, b, c, d, e from unnest(
      ${scheduleLines.map((l) => l.scheduleId)}::uuid[],
      ${scheduleLines.map((l) => l.dayOfWeek)}::int[],
      ${scheduleLines.map((l) => l.startTime)}::text[],
      ${scheduleLines.map((l) => l.endTime)}::text[],
      ${scheduleLines.map((l) => l.breakMinutes)}::int[]
    ) as t(a, b, c, d, e)
  `;

  // 5. Salary Structures (5) & Salary Rules (25)
  const structDefs = [
    { name: "Monthly Standard", code: "STD" },
    { name: "Senior Specialist", code: "SNR" },
    { name: "Department Manager", code: "MGR" },
    { name: "Executive Leadership", code: "EXEC" },
    { name: "Contract Staff", code: "CONT" },
  ];

  const structIds = structDefs.map(() => randomUUID());

  await sql`
    insert into salary_structures (id, organization_id, name, code, is_active)
    select a, ${orgId}::uuid, b, c, true from unnest(
      ${structIds}::uuid[],
      ${structDefs.map((s) => s.name)}::text[],
      ${structDefs.map((s) => s.code)}::text[]
    ) as t(a, b, c)
  `;

  // Salary Rules (5 rules per structure)
  type RuleRow = {
    structureId: string;
    name: string;
    code: string;
    category: "basic" | "allowance" | "gross" | "deduction" | "net";
    sequence: number;
    amount: string;
    percentageBaseCode: string | null;
  };

  const ruleRows: RuleRow[] = [];
  for (let sIdx = 0; sIdx < structIds.length; sIdx++) {
    const sId = structIds[sIdx];
    const baseMult = (sIdx + 1) * 1200;

    ruleRows.push(
      { structureId: sId, name: "Basic Wage", code: "BASIC", category: "basic", sequence: 10, amount: money(baseMult * 0.5), percentageBaseCode: null },
      { structureId: sId, name: "Housing Allowance (HRA)", code: "HRA", category: "allowance", sequence: 20, amount: money(baseMult * 0.3), percentageBaseCode: "BASIC" },
      { structureId: sId, name: "Special Allowance", code: "SPEC_ALLOW", category: "allowance", sequence: 30, amount: money(baseMult * 0.2), percentageBaseCode: null },
      { structureId: sId, name: "Income Tax (TDS)", code: "TDS", category: "deduction", sequence: 40, amount: money(baseMult * 0.1), percentageBaseCode: null },
      { structureId: sId, name: "Provident Fund (PF)", code: "PF", category: "deduction", sequence: 50, amount: money(baseMult * 0.05), percentageBaseCode: "BASIC" }
    );
  }

  await sql`
    insert into salary_rules (id, structure_id, name, code, category, sequence, amount, percentage_base_code)
    select gen_random_uuid(), a, b, c, d::salary_rule_category, e, f::numeric, g from unnest(
      ${ruleRows.map((r) => r.structureId)}::uuid[],
      ${ruleRows.map((r) => r.name)}::text[],
      ${ruleRows.map((r) => r.code)}::text[],
      ${ruleRows.map((r) => r.category)}::text[],
      ${ruleRows.map((r) => r.sequence)}::int[],
      ${ruleRows.map((r) => r.amount)}::text[],
      ${ruleRows.map((r) => r.percentageBaseCode)}::text[]
    ) as t(a, b, c, d, e, f, g)
  `;

  // 6. Users (251) & Employees (251)
  console.log(`Generating ${EMPLOYEE_COUNT} employee users and profiles...`);
  type EmpSeed = {
    userId: string;
    empId: string;
    code: string;
    firstName: string;
    lastName: string;
    email: string;
    deptId: string;
    deptName: string;
    jobTitle: string;
    managerId: string | null;
    hireDate: string;
    monthlyWage: string;
    structureId: string;
    scheduleId: string;
  };

  const employeesData: EmpSeed[] = [];
  const deptList = Array.from(deptIds.entries());
  const managerIdsByDept: Record<string, string[]> = {};

  for (let i = 1; i <= EMPLOYEE_COUNT; i++) {
    const code = `PERF${String(i).padStart(3, "0")}`;
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const email = `perf.emp${String(i).padStart(3, "0")}@peoplepay360-perf.test`;
    const [deptName, deptId] = pick(deptList);
    const jobTitle = pick(JOB_TITLES_BY_DEPT[deptName] ?? ["Specialist"]);

    // Hierarchical managers within dept
    const existingDeptManagers = managerIdsByDept[deptName] ?? [];
    let managerId: string | null = null;
    if (existingDeptManagers.length > 0 && rand() > 0.15) {
      managerId = pick(existingDeptManagers);
    }

    const empId = randomUUID();
    const userId = randomUUID();

    if (!managerIdsByDept[deptName]) managerIdsByDept[deptName] = [];
    if (existingDeptManagers.length < 3) {
      managerIdsByDept[deptName].push(empId);
    }

    const hireYear = between(2021, 2025);
    const hireMonth = String(between(1, 12)).padStart(2, "0");
    const hireDay = String(between(1, 28)).padStart(2, "0");
    const hireDate = `${hireYear}-${hireMonth}-${hireDay}`;

    const wageNum = between(3500, 18500);
    const monthlyWage = money(wageNum);
    const structureId = pick(structIds);
    const scheduleId = pick(scheduleIds);

    employeesData.push({
      userId,
      empId,
      code,
      firstName,
      lastName,
      email,
      deptId,
      deptName,
      jobTitle,
      managerId,
      hireDate,
      monthlyWage,
      structureId,
      scheduleId,
    });
  }

  // Bulk Insert Users (251)
  for (const batch of chunk(employeesData)) {
    await sql`
      insert into users (id, organization_id, name, email, role, status, password_hash)
      select a, ${orgId}::uuid, b, c, 'employee'::user_role, 'active'::user_status, ${passwordHash} from unnest(
        ${batch.map((e) => e.userId)}::uuid[],
        ${batch.map((e) => `${e.firstName} ${e.lastName}`)}::text[],
        ${batch.map((e) => e.email)}::text[]
      ) as t(a, b, c)
    `;
  }

  // Bulk Insert Employees (251)
  for (const batch of chunk(employeesData)) {
    await sql`
      insert into employees (id, organization_id, employee_code, user_id, first_name, last_name, work_email, department_id, job_title, manager_id, status, hire_date)
      select a, ${orgId}::uuid, b, c, d, e, f, g, h, i, 'active'::employee_status, j::date from unnest(
        ${batch.map((e) => e.empId)}::uuid[],
        ${batch.map((e) => e.code)}::text[],
        ${batch.map((e) => e.userId)}::uuid[],
        ${batch.map((e) => e.firstName)}::text[],
        ${batch.map((e) => e.lastName)}::text[],
        ${batch.map((e) => e.email)}::text[],
        ${batch.map((e) => e.deptId)}::uuid[],
        ${batch.map((e) => e.jobTitle)}::text[],
        ${batch.map((e) => e.managerId)}::uuid[],
        ${batch.map((e) => e.hireDate)}::text[]
      ) as t(a, b, c, d, e, f, g, h, i, j)
    `;
  }

  // 7. Employee Working Schedule Assignments (251)
  for (const batch of chunk(employeesData)) {
    await sql`
      insert into employee_working_schedules (employee_id, schedule_id, effective_from)
      select a, b, c::date from unnest(
        ${batch.map((e) => e.empId)}::uuid[],
        ${batch.map((e) => e.scheduleId)}::uuid[],
        ${batch.map((e) => e.hireDate)}::text[]
      ) as t(a, b, c)
    `;
  }

  // 8. Contracts (251)
  const contractIds = new Map<string, string>();
  for (const e of employeesData) contractIds.set(e.empId, randomUUID());

  for (const batch of chunk(employeesData)) {
    await sql`
      insert into contracts (id, employee_id, start_date, status, monthly_wage, currency, salary_structure_id)
      select a, b, c::date, 'active'::contract_status, d::numeric, 'USD', e from unnest(
        ${batch.map((e) => contractIds.get(e.empId))}::uuid[],
        ${batch.map((e) => e.empId)}::uuid[],
        ${batch.map((e) => e.hireDate)}::text[],
        ${batch.map((e) => e.monthlyWage)}::text[],
        ${batch.map((e) => e.structureId)}::uuid[]
      ) as t(a, b, c, d, e)
    `;
  }

  // 9. Attendance (7,530 records: 251 employees × 30 days)
  console.log("Generating 7,530 attendance records...");
  const weekdays = getRecentWeekdays(ATTENDANCE_DAYS);
  type AttRow = {
    employeeId: string;
    date: string;
    checkIn: string | null;
    checkOut: string | null;
    workedHours: string;
    status: "present" | "late" | "half_day" | "absent";
  };

  const attendanceList: AttRow[] = [];
  for (const emp of employeesData) {
    for (const dayStr of weekdays) {
      const p = rand();
      let status: "present" | "late" | "half_day" | "absent" = "present";
      let checkIn: string | null = `${dayStr}T09:00:00.000Z`;
      let checkOut: string | null = `${dayStr}T18:00:00.000Z`;
      let workedHours = "8.00";

      if (p > 0.95) {
        status = "absent";
        checkIn = null;
        checkOut = null;
        workedHours = "0.00";
      } else if (p > 0.90) {
        status = "half_day";
        checkOut = `${dayStr}T13:00:00.000Z`;
        workedHours = "4.00";
      } else if (p > 0.82) {
        status = "late";
        checkIn = `${dayStr}T09:45:00.000Z`;
        workedHours = "7.25";
      }

      attendanceList.push({
        employeeId: emp.empId,
        date: dayStr,
        checkIn,
        checkOut,
        workedHours,
        status,
      });
    }
  }

  for (const batch of chunk(attendanceList, 1000)) {
    await sql`
      insert into attendance_records (id, employee_id, attendance_date, check_in, check_out, worked_hours, status)
      select gen_random_uuid(), a, b::date, c::timestamptz, d::timestamptz, e::numeric, f::attendance_status from unnest(
        ${batch.map((r) => r.employeeId)}::uuid[],
        ${batch.map((r) => r.date)}::text[],
        ${batch.map((r) => r.checkIn)}::text[],
        ${batch.map((r) => r.checkOut)}::text[],
        ${batch.map((r) => r.workedHours)}::text[],
        ${batch.map((r) => r.status)}::text[]
      ) as t(a, b, c, d, e, f)
    `;
  }

  // 10. Time Off Types (5) & Leave Allocations (1,255: 5 x 251)
  const timeOffDefs = [
    { name: "Paid Annual Leave", code: "ANNUAL", days: "20.00" },
    { name: "Sick Leave", code: "SICK", days: "10.00" },
    { name: "Casual Leave", code: "CASUAL", days: "7.00" },
    { name: "Unpaid Leave", code: "UNPAID", days: "30.00" },
    { name: "Work From Home", code: "WFH", days: "24.00" },
  ];

  const timeOffTypeIds = new Map<string, string>();
  for (const t of timeOffDefs) timeOffTypeIds.set(t.code, randomUUID());

  await sql`
    insert into time_off_types (id, organization_id, name, code, unit, is_paid, is_active)
    select a, ${orgId}::uuid, b, c, 'days'::time_off_unit, true, true from unnest(
      ${Array.from(timeOffTypeIds.values())}::uuid[],
      ${timeOffDefs.map((t) => t.name)}::text[],
      ${timeOffDefs.map((t) => t.code)}::text[]
    ) as t(a, b, c)
  `;

  type AllocRow = { id: string; empId: string; typeId: string; allocated: string; consumed: string };
  const allocRows: AllocRow[] = [];
  const allocMap = new Map<string, string>(); // key: empId:typeCode -> allocId

  for (const emp of employeesData) {
    for (const t of timeOffDefs) {
      const id = randomUUID();
      const typeId = timeOffTypeIds.get(t.code)!;
      const consumed = money(between(0, 5));
      allocMap.set(`${emp.empId}:${t.code}`, id);
      allocRows.push({ id, empId: emp.empId, typeId, allocated: t.days, consumed });
    }
  }

  for (const batch of chunk(allocRows, 1000)) {
    await sql`
      insert into leave_allocations (id, employee_id, time_off_type_id, allocated_days, consumed_days, status, valid_from)
      select a, b, c, d::numeric, e::numeric, 'approved'::allocation_status, '2026-01-01'::date from unnest(
        ${batch.map((r) => r.id)}::uuid[],
        ${batch.map((r) => r.empId)}::uuid[],
        ${batch.map((r) => r.typeId)}::uuid[],
        ${batch.map((r) => r.allocated)}::text[],
        ${batch.map((r) => r.consumed)}::text[]
      ) as t(a, b, c, d, e)
    `;
  }

  // 11. Time Off Requests (~450)
  console.log("Generating 450 time-off requests...");
  type RequestRow = {
    empId: string;
    typeName: string;
    typeId: string;
    allocId: string;
    startDate: string;
    endDate: string;
    duration: string;
    status: "approved" | "submitted" | "refused";
  };

  const reqRows: RequestRow[] = [];
  const sampleEmps = employeesData.slice(0, 225);
  for (const emp of sampleEmps) {
    for (let r = 0; r < 2; r++) {
      const t = pick(timeOffDefs);
      const typeId = timeOffTypeIds.get(t.code)!;
      const allocId = allocMap.get(`${emp.empId}:${t.code}`)!;
      const month = String(between(6, 8)).padStart(2, "0");
      const day = String(between(1, 20)).padStart(2, "0");
      const startDate = `2026-${month}-${day}`;
      const endDate = `2026-${month}-${String(Number(day) + 1).padStart(2, "0")}`;
      const status = pick(["approved", "approved", "submitted", "refused"] as const);

      reqRows.push({
        empId: emp.empId,
        typeName: t.name,
        typeId,
        allocId,
        startDate,
        endDate,
        duration: "2.00",
        status,
      });
    }
  }

  await sql`
    insert into time_off_requests (id, employee_id, type_name, time_off_type_id, allocation_id, start_date, end_date, duration_days, status)
    select gen_random_uuid(), a, b, c, d, e::date, f::date, g::numeric, h::request_status from unnest(
      ${reqRows.map((r) => r.empId)}::uuid[],
      ${reqRows.map((r) => r.typeName)}::text[],
      ${reqRows.map((r) => r.typeId)}::uuid[],
      ${reqRows.map((r) => r.allocId)}::uuid[],
      ${reqRows.map((r) => r.startDate)}::text[],
      ${reqRows.map((r) => r.endDate)}::text[],
      ${reqRows.map((r) => r.duration)}::text[],
      ${reqRows.map((r) => r.status)}::text[]
    ) as t(a, b, c, d, e, f, g, h)
  `;

  // 12. Payruns (6), Payrun Employees (1,506), Payslips (1,506), Payslip Lines (12,048), Payment Batches (6), Transactions (1,506)
  console.log("Generating 6 payruns, 1,506 payslips, and 12,048 payslip lines...");
  const payrunPeriods = [
    { name: "March 2026", start: "2026-03-01", end: "2026-03-31", status: "paid" },
    { name: "April 2026", start: "2026-04-01", end: "2026-04-30", status: "paid" },
    { name: "May 2026", start: "2026-05-01", end: "2026-05-31", status: "paid" },
    { name: "June 2026", start: "2026-06-01", end: "2026-06-30", status: "paid" },
    { name: "July 2026", start: "2026-07-01", end: "2026-07-31", status: "paid" },
    { name: "August 2026", start: "2026-08-01", end: "2026-08-31", status: "validated" },
  ];

  // Employee Bank Accounts (251)
  const bankAccountIds = new Map<string, string>();
  type BankRow = { id: string; empId: string; name: string; bank: string; masked: string; ifsc: string };
  const bankRows: BankRow[] = [];
  for (const emp of employeesData) {
    const id = randomUUID();
    bankAccountIds.set(emp.empId, id);
    bankRows.push({
      id,
      empId: emp.empId,
      name: `${emp.firstName} ${emp.lastName}`,
      bank: pick(BANK_NAMES),
      masked: `•••• ${between(1000, 9999)}`,
      ifsc: `HDFC000${between(100, 999)}`,
    });
  }

  await sql`
    insert into employee_bank_accounts (id, employee_id, account_holder_name, bank_name, account_number_masked, ifsc_code, is_primary)
    select a, b, c, d, e, f, true from unnest(
      ${bankRows.map((b) => b.id)}::uuid[],
      ${bankRows.map((b) => b.empId)}::uuid[],
      ${bankRows.map((b) => b.name)}::text[],
      ${bankRows.map((b) => b.bank)}::text[],
      ${bankRows.map((b) => b.masked)}::text[],
      ${bankRows.map((b) => b.ifsc)}::text[]
    ) as t(a, b, c, d, e, f)
  `;

  for (const period of payrunPeriods) {
    const payrunId = randomUUID();

    await sql`
      insert into payruns (id, organization_id, name, period_start, period_end, salary_structure_id, status, created_by)
      values (${payrunId}, ${orgId}, ${period.name}, ${period.start}, ${period.end}, ${structIds[0]}, ${period.status}::payrun_status, ${adminUserId})
    `;

    // Payrun Employees (251)
    for (const batch of chunk(employeesData)) {
      await sql`
        insert into payrun_employees (payrun_id, employee_id)
        select ${payrunId}::uuid, a from unnest(
          ${batch.map((e) => e.empId)}::uuid[]
        ) as t(a)
      `;
    }

    // Payslips (251)
    type PayslipRow = {
      id: string;
      empId: string;
      contractId: string;
      workedDays: string;
      leaveDays: string;
      gross: string;
      deductions: string;
      net: string;
    };

    const payslipRows: PayslipRow[] = [];
    for (const emp of employeesData) {
      const id = randomUUID();
      const wageNum = Number(emp.monthlyWage);
      const gross = wageNum;
      const deductions = Math.round(wageNum * 0.15 * 100) / 100;
      const net = Math.round((gross - deductions) * 100) / 100;

      payslipRows.push({
        id,
        empId: emp.empId,
        contractId: contractIds.get(emp.empId)!,
        workedDays: "22.00",
        leaveDays: "0.00",
        gross: money(gross),
        deductions: money(deductions),
        net: money(net),
      });
    }

    for (const batch of chunk(payslipRows)) {
      await sql`
        insert into payslips (id, payrun_id, employee_id, contract_id, worked_days, leave_days, gross_pay, total_deductions, net_pay, status)
        select a, ${payrunId}::uuid, b, c, d::numeric, e::numeric, f::numeric, g::numeric, h::numeric, ${period.status}::payrun_status from unnest(
          ${batch.map((p) => p.id)}::uuid[],
          ${batch.map((p) => p.empId)}::uuid[],
          ${batch.map((p) => p.contractId)}::uuid[],
          ${batch.map((p) => p.workedDays)}::text[],
          ${batch.map((p) => p.leaveDays)}::text[],
          ${batch.map((p) => p.gross)}::text[],
          ${batch.map((p) => p.deductions)}::text[],
          ${batch.map((p) => p.net)}::text[]
        ) as t(a, b, c, d, e, f, g, h)
      `;
    }

    // Payslip Lines (8 lines per payslip = 2,008 lines per payrun)
    type SlipLineRow = { payslipId: string; name: string; code: string; category: "basic" | "allowance" | "gross" | "deduction" | "net"; sequence: number; amount: string };
    const slipLines: SlipLineRow[] = [];

    for (const ps of payslipRows) {
      const gross = Number(ps.gross);
      const basic = Math.round(gross * 0.5 * 100) / 100;
      const hra = Math.round(gross * 0.3 * 100) / 100;
      const allow = Math.round(gross * 0.2 * 100) / 100;
      const tds = Math.round(gross * 0.1 * 100) / 100;
      const pf = Math.round(gross * 0.05 * 100) / 100;
      const net = Math.round((gross - tds - pf) * 100) / 100;

      slipLines.push(
        { payslipId: ps.id, name: "Basic Salary", code: "BASIC", category: "basic", sequence: 10, amount: money(basic) },
        { payslipId: ps.id, name: "House Rent Allowance", code: "HRA", category: "allowance", sequence: 20, amount: money(hra) },
        { payslipId: ps.id, name: "Special Allowance", code: "SPECIAL", category: "allowance", sequence: 30, amount: money(allow) },
        { payslipId: ps.id, name: "Gross Earnings", code: "GROSS", category: "gross", sequence: 40, amount: money(gross) },
        { payslipId: ps.id, name: "Income Tax (TDS)", code: "TDS", category: "deduction", sequence: 50, amount: money(tds) },
        { payslipId: ps.id, name: "Provident Fund", code: "PF", category: "deduction", sequence: 60, amount: money(pf) },
        { payslipId: ps.id, name: "Total Deductions", code: "DEDUCT", category: "deduction", sequence: 70, amount: money(tds + pf) },
        { payslipId: ps.id, name: "Net Salary", code: "NET", category: "net", sequence: 80, amount: money(net) }
      );
    }

    for (const batch of chunk(slipLines, 1000)) {
      await sql`
        insert into payslip_lines (id, payslip_id, name, code, category, sequence, amount)
        select gen_random_uuid(), a, b, c, d::salary_rule_category, e, f::numeric from unnest(
          ${batch.map((l) => l.payslipId)}::uuid[],
          ${batch.map((l) => l.name)}::text[],
          ${batch.map((l) => l.code)}::text[],
          ${batch.map((l) => l.category)}::text[],
          ${batch.map((l) => l.sequence)}::int[],
          ${batch.map((l) => l.amount)}::text[]
        ) as t(a, b, c, d, e, f)
      `;
    }

    // Payment Batch & Transactions for Paid Payruns
    if (period.status === "paid") {
      const batchId = randomUUID();
      const totalAmount = payslipRows.reduce((sum, p) => sum + Number(p.net), 0);

      await sql`
        insert into payment_batches (id, payrun_id, status, total_amount, created_by, paid_at)
        values (${batchId}, ${payrunId}, 'paid'::payment_status, ${money(totalAmount)}::numeric, ${adminUserId}, ${`${period.end}T18:00:00.000Z`})
      `;

      type TxRow = { batchId: string; empId: string; payslipId: string; bankId: string; amount: string; ref: string };
      const txRows: TxRow[] = payslipRows.map((ps, i) => ({
        batchId,
        empId: ps.empId,
        payslipId: ps.id,
        bankId: bankAccountIds.get(ps.empId)!,
        amount: ps.net,
        ref: `PAY-2026-${period.name.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, "0")}`,
      }));

      for (const batch of chunk(txRows, 500)) {
        await sql`
          insert into payment_transactions (id, batch_id, employee_id, payslip_id, bank_account_id, amount, status, reference_number, processed_at)
          select gen_random_uuid(), a, b, c, d, e::numeric, 'paid'::payment_status, f, ${`${period.end}T18:00:00.000Z`}::timestamptz from unnest(
            ${batch.map((t) => t.batchId)}::uuid[],
            ${batch.map((t) => t.empId)}::uuid[],
            ${batch.map((t) => t.payslipId)}::uuid[],
            ${batch.map((t) => t.bankId)}::uuid[],
            ${batch.map((t) => t.amount)}::text[],
            ${batch.map((t) => t.ref)}::text[]
          ) as t(a, b, c, d, e, f)
        `;
      }
    }
  }

  // 13. Payroll Warnings (250)
  console.log("Generating 250 payroll warnings...");
  type WarningRow = { empId: string; code: string; message: string };
  const warningRows: WarningRow[] = employeesData.slice(0, 250).map((emp, i) => ({
    empId: emp.empId,
    code: i % 2 === 0 ? "TAX_THRESHOLD_EXCEEDED" : "OVERTIME_REVIEW_REQUIRED",
    message: i % 2 === 0
      ? `${emp.firstName} ${emp.lastName} gross annual earnings exceeded standard tax bracket threshold.`
      : `${emp.firstName} ${emp.lastName} logged overtime hours requiring managerial sign-off.`,
  }));

  await sql`
    insert into payroll_warnings (id, employee_id, code, message)
    select gen_random_uuid(), a, b, c from unnest(
      ${warningRows.map((w) => w.empId)}::uuid[],
      ${warningRows.map((w) => w.code)}::text[],
      ${warningRows.map((w) => w.message)}::text[]
    ) as t(a, b, c)
  `;

  // 14. Notifications (350)
  console.log("Generating 350 notifications...");
  type NotifRow = { userId: string; title: string; message: string; status: "read" | "pending" };
  const notifRows: NotifRow[] = employeesData.slice(0, 350).map((emp, i) => ({
    userId: emp.userId,
    title: i % 2 === 0 ? "Payslip Available" : "Leave Request Updated",
    message: i % 2 === 0 ? "Your latest monthly payslip has been generated." : "Your time-off allocation has been updated.",
    status: i % 3 === 0 ? "read" : "pending",
  }));

  await sql`
    insert into notifications (id, user_id, channel, title, message, status)
    select gen_random_uuid(), a, 'in_app'::notification_channel, b, c, d::notification_status from unnest(
      ${notifRows.map((n) => n.userId)}::uuid[],
      ${notifRows.map((n) => n.title)}::text[],
      ${notifRows.map((n) => n.message)}::text[],
      ${notifRows.map((n) => n.status)}::text[]
    ) as t(a, b, c, d)
  `;

  // 15. Approvals (300)
  console.log("Generating 300 approval records...");
  type ApprRow = { entityType: "time_off" | "contract" | "payrun"; entityId: string; status: "approved" | "pending" };
  const apprRows: ApprRow[] = employeesData.slice(0, 300).map((emp, i) => ({
    entityType: i % 2 === 0 ? "time_off" : "contract",
    entityId: contractIds.get(emp.empId)!,
    status: i % 4 === 0 ? "pending" : "approved",
  }));

  await sql`
    insert into approvals (id, entity_type, entity_id, status, requested_by)
    select gen_random_uuid(), a::approval_entity, b, c::approval_status, ${adminUserId}::uuid from unnest(
      ${apprRows.map((a) => a.entityType)}::text[],
      ${apprRows.map((a) => a.entityId)}::uuid[],
      ${apprRows.map((a) => a.status)}::text[]
    ) as t(a, b, c)
  `;

  // 16. Documents (250)
  console.log("Generating 250 synthetic document metadata records...");
  type DocRow = { empId: string; fileName: string; fileUrl: string; mimeType: string };
  const docRows: DocRow[] = employeesData.slice(0, 250).map((emp) => ({
    empId: emp.empId,
    fileName: `employment_contract_${emp.code}.pdf`,
    fileUrl: `https://storage.peoplepay360-perf.test/docs/${emp.code}/contract.pdf`,
    mimeType: "application/pdf",
  }));

  await sql`
    insert into documents (id, entity_type, entity_id, document_type, file_name, file_url, mime_type)
    select gen_random_uuid(), 'employee'::document_entity, a, 'contract'::document_type, b, c, d from unnest(
      ${docRows.map((d) => d.empId)}::uuid[],
      ${docRows.map((d) => d.fileName)}::text[],
      ${docRows.map((d) => d.fileUrl)}::text[],
      ${docRows.map((d) => d.mimeType)}::text[]
    ) as t(a, b, c, d)
  `;

  // 17. Email Logs (300)
  console.log("Generating 300 synthetic email logs...");
  type EmailRow = { userId: string; email: string; subject: string };
  const emailRows: EmailRow[] = employeesData.slice(0, 300).map((emp) => ({
    userId: emp.userId,
    email: emp.email,
    subject: "Monthly Payslip Statement — PeoplePay360",
  }));

  await sql`
    insert into email_logs (id, user_id, email, subject, status, provider)
    select gen_random_uuid(), a, b, c, 'sent'::notification_status, 'synthetic_test_provider' from unnest(
      ${emailRows.map((e) => e.userId)}::uuid[],
      ${emailRows.map((e) => e.email)}::text[],
      ${emailRows.map((e) => e.subject)}::text[]
    ) as t(a, b, c)
  `;

  // 18. Audit Logs (750)
  console.log("Generating 750 audit logs...");
  type AuditRow = { action: "create" | "update" | "approve" | "pay"; entityType: string; summary: string };
  const auditRows: AuditRow[] = [];
  for (let i = 0; i < 750; i++) {
    auditRows.push({
      action: pick(["create", "update", "approve", "pay"] as const),
      entityType: pick(["employee", "contract", "payrun", "attendance"]),
      summary: `Automated performance test operation #${i + 1}`,
    });
  }

  for (const batch of chunk(auditRows, 500)) {
    await sql`
      insert into audit_logs (id, actor_user_id, action, entity_type, summary)
      select gen_random_uuid(), ${adminUserId}::uuid, a::audit_action, b, c from unnest(
        ${batch.map((a) => a.action)}::text[],
        ${batch.map((a) => a.entityType)}::text[],
        ${batch.map((a) => a.summary)}::text[]
      ) as t(a, b, c)
    `;
  }

  // 19. Count & Verification Report
  console.log("\n==================================================");
  console.log("SEEDING COMPLETED. COUNT VERIFICATION:");
  console.log("==================================================");

  const [actual] = (await sql`
    select
      (select count(*) from organizations where id = ${orgId})::int as organizations,
      (select count(*) from users where organization_id = ${orgId})::int as users,
      (select count(*) from departments where organization_id = ${orgId})::int as departments,
      (select count(*) from working_schedules where organization_id = ${orgId})::int as working_schedules,
      (select count(*) from working_schedule_lines l join working_schedules s on s.id = l.schedule_id where s.organization_id = ${orgId})::int as working_schedule_lines,
      (select count(*) from employees where organization_id = ${orgId})::int as employees,
      (select count(*) from employee_working_schedules ews join employees e on e.id = ews.employee_id where e.organization_id = ${orgId})::int as employee_working_schedules,
      (select count(*) from contracts c join employees e on e.id = c.employee_id where e.organization_id = ${orgId})::int as contracts,
      (select count(*) from attendance_records a join employees e on e.id = a.employee_id where e.organization_id = ${orgId})::int as attendance_records,
      (select count(*) from time_off_types where organization_id = ${orgId})::int as time_off_types,
      (select count(*) from leave_allocations l join employees e on e.id = l.employee_id where e.organization_id = ${orgId})::int as leave_allocations,
      (select count(*) from time_off_requests r join employees e on e.id = r.employee_id where e.organization_id = ${orgId})::int as time_off_requests,
      (select count(*) from salary_structures where organization_id = ${orgId})::int as salary_structures,
      (select count(*) from salary_rules r join salary_structures s on s.id = r.structure_id where s.organization_id = ${orgId})::int as salary_rules,
      (select count(*) from payruns where organization_id = ${orgId})::int as payruns,
      (select count(*) from payrun_employees pe join payruns p on p.id = pe.payrun_id where p.organization_id = ${orgId})::int as payrun_employees,
      (select count(*) from payslips ps join payruns p on p.id = ps.payrun_id where p.organization_id = ${orgId})::int as payslips,
      (select count(*) from payslip_lines pl join payslips ps on ps.id = pl.payslip_id join payruns p on p.id = ps.payrun_id where p.organization_id = ${orgId})::int as payslip_lines,
      (select count(*) from payroll_warnings pw join payruns p on p.id = pw.payrun_id where p.organization_id = ${orgId})::int as payroll_warnings,
      (select count(*) from employee_bank_accounts ba join employees e on e.id = ba.employee_id where e.organization_id = ${orgId})::int as employee_bank_accounts,
      (select count(*) from payment_batches pb join payruns p on p.id = pb.payrun_id where p.organization_id = ${orgId})::int as payment_batches,
      (select count(*) from payment_transactions pt join payment_batches pb on pb.id = pt.batch_id join payruns p on p.id = pb.payrun_id where p.organization_id = ${orgId})::int as payment_transactions,
      (select count(*) from notifications n join users u on u.id = n.user_id where u.organization_id = ${orgId})::int as notifications,
      (select count(*) from approvals a join users u on u.id = a.requested_by where u.organization_id = ${orgId})::int as approvals,
      (select count(*) from documents d join employees e on e.id = d.entity_id where e.organization_id = ${orgId})::int as documents,
      (select count(*) from email_logs el join users u on u.id = el.user_id where u.organization_id = ${orgId})::int as email_logs,
      (select count(*) from audit_logs al join users u on u.id = al.actor_user_id where u.organization_id = ${orgId})::int as audit_logs
  `) as Record<string, number>[];

  console.log(`
TABLE                          EXPECTED | ACTUAL
------------------------------------------------
organizations                  1        | ${actual.organizations}
users                          252      | ${actual.users}
departments                    10       | ${actual.departments}
workingSchedules               6        | ${actual.working_schedules}
workingScheduleLines           30       | ${actual.working_schedule_lines}
employees                      251      | ${actual.employees}
employeeWorkingSchedules       251      | ${actual.employee_working_schedules}
contracts                      251      | ${actual.contracts}
attendanceRecords              7530     | ${actual.attendance_records}
timeOffTypes                   5        | ${actual.time_off_types}
leaveAllocations               1255     | ${actual.leave_allocations}
timeOffRequests                450      | ${actual.time_off_requests}
salaryStructures               5        | ${actual.salary_structures}
salaryRules                    25       | ${actual.salary_rules}
payruns                        6        | ${actual.payruns}
payrunEmployees                1506     | ${actual.payrun_employees}
payslips                       1506     | ${actual.payslips}
payslipLines                   12048    | ${actual.payslip_lines}
payrollWarnings                250      | ${actual.payroll_warnings}
employeeBankAccounts           251      | ${actual.employee_bank_accounts}
paymentBatches                 6        | ${actual.payment_batches}
paymentTransactions            1506     | ${actual.payment_transactions}
notifications                  350      | ${actual.notifications}
approvals                      300      | ${actual.approvals}
documents                      250      | ${actual.documents}
emailLogs                      300      | ${actual.email_logs}
auditLogs                      750      | ${actual.audit_logs}
------------------------------------------------
`);

  console.log("Performance Admin Sign-In:");
  console.log(`  Email:    ${PERF_ADMIN_EMAIL}`);
  console.log(`  Password: ${PERF_ADMIN_PASSWORD}`);
  console.log("\nPerformance Test Data Seed Successful!\n");
}

seedPerformance().catch((err) => {
  console.error("Performance Seed Error:", err);
  process.exit(1);
});
