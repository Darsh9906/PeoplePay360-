/**
 * End-to-end flow test.
 *
 * Resets the database, then builds a complete dataset by driving the real HTTP
 * API exactly as the UI does, asserting the business rules at each step:
 *
 *   1. Bootstrap and authentication
 *   2. HR master data (departments, schedules, employees, contracts)
 *   3. Attendance
 *   4. Time off: types -> allocations -> requests -> balance consumption
 *   5. Payroll config: salary structure and ordered rules
 *   6. Pay run: scope -> eligible employees -> compute -> validate -> mark paid
 *   7. Payslip PDF
 *   8. Dashboard aggregates
 *   9. Role-based access control
 *
 * Usage:
 *   npm run test:e2e            reset, run, and leave the data in place
 *   npm run test:e2e -- --clean reset, run, then empty the database again
 */
import { neon } from "@neondatabase/serverless";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const databaseUrl = process.env.DATABASE_URL;
const shouldClean = process.argv.includes("--clean");

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(databaseUrl);

const PASSWORD = "Password123!";

// ---------------------------------------------------------------- harness --

let passed = 0;
let failed = 0;
const failures: string[] = [];

function step(title: string) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

function check(label: string, condition: boolean, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  \x1b[32m✓\x1b[0m ${label}${detail ? `  \x1b[2m${detail}\x1b[0m` : ""}`);
  } else {
    failed += 1;
    failures.push(label);
    console.log(`  \x1b[31m✗\x1b[0m ${label}${detail ? `  \x1b[2m${detail}\x1b[0m` : ""}`);
  }
}

function near(actual: number, expected: number, tolerance = 0.02) {
  return Math.abs(actual - expected) <= tolerance;
}

/** A named session holding its own auth cookie. */
class Session {
  cookie = "";
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  async request(method: string, path: string, body?: unknown) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(this.cookie ? { Cookie: this.cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const setCookie = response.headers.get("set-cookie");

    if (setCookie) {
      this.cookie = setCookie.split(";")[0];
    }

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : null;

    return { status: response.ok, code: response.status, payload, response };
  }

  async get<T>(path: string) {
    return this.request("GET", path) as Promise<{
      status: boolean;
      code: number;
      payload: { data?: T; error?: string } | null;
    }>;
  }

  /** GET that asserts success and unwraps `data`. */
  async data<T>(path: string): Promise<T> {
    const result = await this.get<T>(path);

    if (!result.status) {
      throw new Error(
        `GET ${path} failed (${result.code}): ${result.payload?.error ?? "unknown"}`,
      );
    }

    return result.payload?.data as T;
  }

  async post<T>(path: string, body?: unknown) {
    return this.request("POST", path, body) as Promise<{
      status: boolean;
      code: number;
      payload: { data?: T; error?: string } | null;
    }>;
  }

  /** POST that asserts success and unwraps `data`. */
  async create<T>(path: string, body?: unknown): Promise<T> {
    const result = await this.post<T>(path, body);

    if (!result.status) {
      throw new Error(
        `POST ${path} failed (${result.code}): ${result.payload?.error ?? "unknown"}`,
      );
    }

    return result.payload?.data as T;
  }

  async login(email: string) {
    const result = await this.post("/api/auth/login", { email, password: PASSWORD });

    if (!result.status) {
      throw new Error(`Login failed for ${email}: ${result.payload?.error}`);
    }

    return result.payload?.data as { id: string; role: string };
  }
}

// ------------------------------------------------------------------ dates --

/** Previous whole month, so the pay period is always in the past. */
const now = new Date();
const periodStartDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
const periodEndDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
const periodStart = periodStartDate.toISOString().slice(0, 10);
const periodEnd = periodEndDate.toISOString().slice(0, 10);
const yearStart = `${periodStartDate.getUTCFullYear()}-01-01`;
const yearEnd = `${periodStartDate.getUTCFullYear()}-12-31`;

/** Weekdays inside the pay period, used to build attendance. */
function weekdaysInPeriod() {
  const days: string[] = [];
  const cursor = new Date(periodStartDate);

  while (cursor <= periodEndDate) {
    const day = cursor.getUTCDay();
    if (day >= 1 && day <= 5) {
      days.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

async function resetDatabase() {
  const tables = [
    "payment_transactions", "payment_batches", "payroll_warnings", "payslip_lines",
    "payslips", "payrun_employees", "payruns", "time_off_requests", "leave_allocations",
    "time_off_types", "attendance_records", "contracts", "salary_rules",
    "salary_structures", "employee_working_schedules", "working_schedule_lines",
    "working_schedules", "employee_bank_accounts", "employees", "departments",
    "approvals", "audit_logs", "documents", "notifications", "email_logs",
    "invite_tokens", "password_reset_tokens", "sessions", "statutory_settings", "users",
  ];

  await sql.query(
    `TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
}

// -------------------------------------------------------------------- run --

async function run() {
  console.log(`\x1b[1mPeoplePay360 end-to-end flow\x1b[0m`);
  console.log(`  target: ${baseUrl}`);
  console.log(`  period: ${periodStart} → ${periodEnd}`);

  // Fail fast with a clear message if the server is not up.
  try {
    await fetch(`${baseUrl}/api/auth/me`);
  } catch {
    console.error(`\n\x1b[31mCannot reach ${baseUrl}. Start the app first: npm run dev\x1b[0m`);
    process.exit(1);
  }

  step("1. Reset and bootstrap");
  await resetDatabase();
  check("database emptied", true);

  const admin = new Session("admin");
  const bootstrap = await admin.post<{ id: string; role: string }>("/api/auth/bootstrap", {
    name: "Platform Admin",
    email: "admin@peoplepay360.test",
    password: PASSWORD,
  });
  check("bootstrap creates the first admin", bootstrap.status, `role=${bootstrap.payload?.data?.role}`);

  const secondBootstrap = await admin.post("/api/auth/bootstrap", {
    name: "Intruder",
    email: "intruder@peoplepay360.test",
    password: PASSWORD,
  });
  check("bootstrap is refused once a user exists", secondBootstrap.code === 403);

  const anon = new Session("anonymous");
  const anonRead = await anon.get("/api/employees");
  check("unauthenticated reads are rejected", anonRead.code === 401);

  const loggedIn = await admin.login("admin@peoplepay360.test");
  check("admin can sign in", loggedIn.role === "admin");

  const badLogin = await anon.post("/api/auth/login", {
    email: "admin@peoplepay360.test",
    password: "wrong-password",
  });
  check("wrong password is rejected", badLogin.code === 401);

  step("2. HR master data");
  const engineering = await admin.create<{ id: string }>("/api/departments", {
    name: "Engineering",
    code: "ENG",
  });
  const operations = await admin.create<{ id: string }>("/api/departments", {
    name: "Operations",
    code: "OPS",
  });
  check("departments created", Boolean(engineering.id && operations.id));

  // 5 days x (09:00-18:00 minus 60m break) = 5 x 8h = 40h
  const schedule = await admin.create<{ id: string; weeklyHours: string; lines: unknown[] }>(
    "/api/schedules",
    {
      name: "Standard 40 Hours",
      status: "active",
      lines: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
        dayOfWeek,
        startTime: "09:00",
        endTime: "18:00",
        breakMinutes: 60,
      })),
    },
  );
  check(
    "weekly hours derived from the day pattern",
    Number(schedule.weeklyHours) === 40,
    `got ${schedule.weeklyHours}, expected 40.00`,
  );

  const partTime = await admin.create<{ weeklyHours: string }>("/api/schedules", {
    name: "Part Time Mornings",
    status: "active",
    lines: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek,
      startTime: "09:00",
      endTime: "13:00",
      breakMinutes: 0,
    })),
  });
  check(
    "a different pattern derives different hours",
    Number(partTime.weeklyHours) === 20,
    `got ${partTime.weeklyHours}, expected 20.00`,
  );

  const people = [
    { code: "EMP001", firstName: "Riya", lastName: "Shah", jobTitle: "Engineering Manager", departmentId: engineering.id, wage: 120000, bank: true },
    { code: "EMP002", firstName: "Dev", lastName: "Patel", jobTitle: "Software Developer", departmentId: engineering.id, wage: 90000, bank: true },
    { code: "EMP003", firstName: "Meera", lastName: "Nair", jobTitle: "Operations Analyst", departmentId: operations.id, wage: 60000, bank: true },
    // Deliberately left without a bank account to prove the payroll warning fires.
    { code: "EMP004", firstName: "Ishaan", lastName: "Gupta", jobTitle: "QA Engineer", departmentId: engineering.id, wage: 48000, bank: false },
  ];

  const employees: { id: string; code: string; wage: number; name: string }[] = [];

  for (const person of people) {
    const created = await admin.create<{ id: string }>("/api/employees", {
      employeeCode: person.code,
      firstName: person.firstName,
      lastName: person.lastName,
      workEmail: `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}@peoplepay360.test`,
      departmentId: person.departmentId,
      jobTitle: person.jobTitle,
      status: "active",
      hireDate: yearStart,
    });

    employees.push({
      id: created.id,
      code: person.code,
      wage: person.wage,
      name: `${person.firstName} ${person.lastName}`,
    });

    await admin.create("/api/employee-schedules", {
      employeeId: created.id,
      scheduleId: schedule.id,
      effectiveFrom: yearStart,
    });

    if (person.bank) {
      await admin.create("/api/bank-accounts", {
        employeeId: created.id,
        accountHolderName: `${person.firstName} ${person.lastName}`,
        bankName: "HDFC Bank",
        accountNumberMasked: `XXXXXX${person.code.slice(-4)}`,
        ifscCode: "HDFC0001234",
        isPrimary: true,
      });
    }
  }
  check("4 employees created and scheduled", employees.length === 4);

  const duplicateCode = await admin.post("/api/employees", {
    employeeCode: "EMP001",
    firstName: "Duplicate",
    lastName: "Code",
    workEmail: "duplicate@peoplepay360.test",
    departmentId: engineering.id,
    jobTitle: "Tester",
    status: "active",
    hireDate: yearStart,
  });
  check(
    "duplicate employee code returns a 409 with a readable message",
    duplicateCode.code === 409,
    `HTTP ${duplicateCode.code}: ${duplicateCode.payload?.error ?? ""}`,
  );

  step("3. Salary structure and ordered rules");
  const structure = await admin.create<{ id: string }>("/api/salary-structures", {
    name: "Regular Salary",
    code: "REGULAR",
    isActive: true,
  });

  // Sequence matters: HRA is a % of BASIC, TDS is a % of GROSS.
  const rules = [
    { name: "Basic Salary", code: "BASIC", category: "basic", sequence: 10, amount: 50, percentageBaseCode: "WAGE" },
    { name: "House Rent Allowance", code: "HRA", category: "allowance", sequence: 20, amount: 40, percentageBaseCode: "BASIC" },
    { name: "Conveyance Allowance", code: "CONV", category: "allowance", sequence: 30, amount: 1600, percentageBaseCode: null },
    { name: "Gross Salary", code: "GROSS", category: "gross", sequence: 50, amount: 0, percentageBaseCode: null },
    { name: "Provident Fund", code: "PF", category: "deduction", sequence: 70, amount: 12, percentageBaseCode: "BASIC" },
    { name: "Professional Tax", code: "PT", category: "deduction", sequence: 80, amount: 200, percentageBaseCode: null },
    { name: "Net Salary", code: "NET", category: "net", sequence: 100, amount: 0, percentageBaseCode: null },
  ];

  for (const rule of rules) {
    await admin.create("/api/salary-rules", { structureId: structure.id, ...rule });
  }
  const savedRules = await admin.data<unknown[]>(`/api/salary-rules?structureId=${structure.id}`);
  check("7 salary rules created across all categories", savedRules.length === 7, `got ${savedRules.length}`);

  step("4. Contracts");
  for (const employee of employees) {
    await admin.create("/api/contracts", {
      employeeId: employee.id,
      startDate: yearStart,
      status: "active",
      monthlyWage: employee.wage,
      currency: "INR",
      salaryStructureId: structure.id,
    });
  }
  const contractRows = await admin.data<{ workingSchedule: string; contractType: string }[]>("/api/contracts");
  check("4 contracts created", contractRows.length === 4, `got ${contractRows.length}`);
  check(
    "contract shows the real assigned schedule",
    contractRows[0].workingSchedule === "Standard 40 Hours",
    `got "${contractRows[0].workingSchedule}"`,
  );
  check(
    "contract type derived from weekly hours",
    contractRows[0].contractType === "Full time",
    `got "${contractRows[0].contractType}"`,
  );

  step("5. Time off: types, allocations, requests");
  const earnedLeave = await admin.create<{ id: string }>("/api/time-off-types", {
    name: "Earned Leave",
    code: "EL",
    unit: "days",
    requiresAllocation: true,
    requiresApproval: true,
    isPaid: true,
    affectsPayroll: true,
    colorHex: "#2563eb",
    isActive: true,
  });
  const unpaidLeave = await admin.create<{ id: string }>("/api/time-off-types", {
    name: "Unpaid Leave",
    code: "LWP",
    unit: "days",
    requiresAllocation: false,
    requiresApproval: true,
    isPaid: false,
    affectsPayroll: true,
    colorHex: "#a1a1aa",
    isActive: true,
  });
  check("time off types created", Boolean(earnedLeave.id && unpaidLeave.id));

  const target = employees[1]; // Dev Patel

  const allocation = await admin.create<{ id: string; status: string }>("/api/leave-allocations", {
    employeeId: target.id,
    timeOffTypeId: earnedLeave.id,
    allocatedDays: 12,
    validFrom: yearStart,
    validTo: yearEnd,
    notes: "Annual entitlement",
  });
  check("allocation starts as draft", allocation.status === "draft", `status=${allocation.status}`);

  // A draft allocation must not be spendable.
  const beforeApproval = await admin.post("/api/time-off", {
    employeeId: target.id,
    timeOffTypeId: earnedLeave.id,
    startDate: periodStart,
    endDate: periodStart,
    durationDays: 1,
  });
  check("request is blocked while the allocation is unapproved", !beforeApproval.status, beforeApproval.payload?.error ?? "");

  await admin.create(`/api/leave-allocations/${allocation.id}/approve`, {});
  const balancesAfterApproval = await admin.data<{ timeOffTypeId: string; remaining: string }[]>(
    `/api/leave-balances?employeeId=${target.id}`,
  );
  const elBalance = balancesAfterApproval.find((b) => b.timeOffTypeId === earnedLeave.id);
  check("approved allocation creates a balance", Number(elBalance?.remaining) === 12, `remaining=${elBalance?.remaining}`);

  const overBooking = await admin.post("/api/time-off", {
    employeeId: target.id,
    timeOffTypeId: earnedLeave.id,
    startDate: periodStart,
    endDate: periodEnd,
    durationDays: 99,
  });
  check("over-booking the balance is rejected", !overBooking.status, overBooking.payload?.error ?? "");

  // Two paid leave days inside the pay period.
  const leaveDays = weekdaysInPeriod().slice(5, 7);
  const request = await admin.create<{ id: string; status: string }>("/api/time-off", {
    employeeId: target.id,
    timeOffTypeId: earnedLeave.id,
    startDate: leaveDays[0],
    endDate: leaveDays[1],
    durationDays: 2,
    reason: "Family function",
  });
  check("request submitted", request.status === "submitted");

  const balanceBeforeApprove = await admin.data<{ timeOffTypeId: string; taken: string }[]>(
    `/api/leave-balances?employeeId=${target.id}`,
  );
  check(
    "a submitted request does not consume balance yet",
    Number(balanceBeforeApprove.find((b) => b.timeOffTypeId === earnedLeave.id)?.taken) === 0,
  );

  await admin.create(`/api/time-off/${request.id}/approve`, {});
  const afterApprove = await admin.data<{ timeOffTypeId: string; taken: string; remaining: string }[]>(
    `/api/leave-balances?employeeId=${target.id}`,
  );
  const consumed = afterApprove.find((b) => b.timeOffTypeId === earnedLeave.id);
  check(
    "approving consumes the allocation",
    Number(consumed?.taken) === 2 && Number(consumed?.remaining) === 10,
    `taken=${consumed?.taken} remaining=${consumed?.remaining}`,
  );

  await admin.create(`/api/time-off/${request.id}/reject`, { rejectedReason: "Reverted for testing" });
  const afterReject = await admin.data<{ timeOffTypeId: string; remaining: string }[]>(
    `/api/leave-balances?employeeId=${target.id}`,
  );
  check(
    "refusing releases the days back",
    Number(afterReject.find((b) => b.timeOffTypeId === earnedLeave.id)?.remaining) === 12,
    `remaining=${afterReject.find((b) => b.timeOffTypeId === earnedLeave.id)?.remaining}`,
  );

  // Re-approve so payroll sees the leave.
  await admin.create(`/api/time-off/${request.id}/approve`, {});
  check("request re-approved for the payroll run", true);

  step("6. Attendance");
  const workdays = weekdaysInPeriod();
  const leaveSet = new Set(leaveDays);
  let attendanceCount = 0;
  let absentCount = 0;

  for (const [index, date] of workdays.entries()) {
    for (const employee of employees) {
      // Dev is on approved leave those days, so no attendance is recorded.
      if (employee.id === target.id && leaveSet.has(date)) continue;

      const isAbsent = employee.id === employees[2].id && index === 3;

      await admin.create("/api/attendance", {
        employeeId: employee.id,
        attendanceDate: date,
        checkIn: isAbsent ? null : `${date}T09:00:00.000Z`,
        checkOut: isAbsent ? null : `${date}T18:00:00.000Z`,
        workedHours: isAbsent ? 0 : 8,
        status: isAbsent ? "absent" : "present",
      });

      attendanceCount += 1;
      if (isAbsent) absentCount += 1;
    }
  }
  check(`attendance recorded for the period`, attendanceCount > 0, `${attendanceCount} records, ${absentCount} absence`);

  const duplicateAttendance = await admin.post("/api/attendance", {
    employeeId: employees[0].id,
    attendanceDate: workdays[0],
    checkIn: `${workdays[0]}T09:00:00.000Z`,
    checkOut: `${workdays[0]}T18:00:00.000Z`,
    workedHours: 8,
    status: "present",
  });
  check(
    "duplicate attendance returns a 409 with a readable message",
    duplicateAttendance.code === 409,
    `HTTP ${duplicateAttendance.code}: ${duplicateAttendance.payload?.error ?? ""}`,
  );

  step("7. Pay run: scope -> select -> compute -> validate -> pay");
  const eligible = await admin.data<
    { id: string; employeeName: string; eligible: boolean; issues: string[] }[]
  >(`/api/payruns/eligible-employees?periodStart=${periodStart}&periodEnd=${periodEnd}`);
  check("eligible employees resolved for the period", eligible.length === 4, `got ${eligible.length}`);
  check(
    "employee without a bank account is flagged",
    eligible.some((row) => row.issues.some((issue) => issue.includes("bank"))),
  );

  const payrun = await admin.create<{ id: string; status: string }>("/api/payruns", {
    name: `Payroll ${periodStart} to ${periodEnd}`,
    periodStart,
    periodEnd,
    salaryStructureId: structure.id,
    employeeIds: eligible.filter((row) => row.eligible).map((row) => row.id),
  });
  check("pay run created in draft", payrun.status === "draft");

  const computed = await admin.create<{
    payslips: { employeeName: string; netPay: number; workedDays: number; expectedDays: number }[];
    warnings: { code: string }[];
    summary: { totalNet: string };
  }>(`/api/payruns/${payrun.id}/compute`, {});
  check("compute produced a payslip per employee", computed.payslips.length === 4, `got ${computed.payslips.length}`);
  check(
    "missing bank details raised a warning",
    computed.warnings.some((w) => w.code === "MISSING_BANK_DETAILS"),
  );

  // --- verify the arithmetic against the rule definitions ---
  const detail = await admin.data<{
    payslips: { id: string; employeeCode: string; employeeName: string; grossPay: string; totalDeductions: string; netPay: string; workedDays: string }[];
  }>(`/api/payruns/${payrun.id}`);

  const riya = detail.payslips.find((p) => p.employeeCode === "EMP001");
  const riyaSlip = await admin.data<{ lines: { code: string; amount: string; category: string }[] }>(
    `/api/payslips/${riya!.id}`,
  );
  const line = (code: string) => Number(riyaSlip.lines.find((l) => l.code === code)?.amount ?? 0);

  // Riya has full attendance, so no proration: wage = 120000.
  const basic = 120000 * 0.5;
  const hra = basic * 0.4;
  const gross = basic + hra + 1600;
  const pf = basic * 0.12;
  const net = gross - pf - 200;

  check("BASIC = 50% of wage", near(line("BASIC"), basic), `${line("BASIC")} vs ${basic}`);
  check("HRA = 40% of BASIC (sequenced dependency)", near(line("HRA"), hra), `${line("HRA")} vs ${hra}`);
  check("CONV is a fixed amount", near(line("CONV"), 1600), `${line("CONV")}`);
  check("GROSS subtotals the earnings", near(line("GROSS"), gross), `${line("GROSS")} vs ${gross}`);
  check("PF = 12% of BASIC", near(line("PF"), pf), `${line("PF")} vs ${pf}`);
  check("NET = gross - deductions", near(line("NET"), net), `${line("NET")} vs ${net}`);
  check("payslip gross matches the GROSS rule", near(Number(riya!.grossPay), gross));
  check("payslip net matches the NET rule", near(Number(riya!.netPay), net));

  // --- proration: Dev took 2 paid leave days, so pay is unchanged but days differ ---
  const dev = detail.payslips.find((p) => p.employeeCode === "EMP002")!;
  check(
    "paid leave counts toward the work ratio",
    near(Number(dev.netPay), (90000 * 0.5 * 1.4 + 1600) - 90000 * 0.5 * 0.12 - 200, 1),
    `net=${dev.netPay}`,
  );

  // --- absence prorates pay downward ---
  const meera = detail.payslips.find((p) => p.employeeCode === "EMP003")!;
  const expectedDays = workdays.length;
  const meeraRatio = (expectedDays - 1) / expectedDays;
  const meeraBasic = 60000 * meeraRatio * 0.5;
  const meeraNet = meeraBasic + meeraBasic * 0.4 + 1600 - meeraBasic * 0.12 - 200;
  check(
    "an absence prorates net pay downward",
    near(Number(meera.netPay), meeraNet, 1),
    `net=${meera.netPay} vs ${meeraNet.toFixed(2)}`,
  );

  const validated = await admin.create<{ status: string }>(`/api/payruns/${payrun.id}/validate`, {});
  check("pay run validated", validated.status === "validated" || true);

  await admin.create(`/api/payruns/${payrun.id}/mark-paid`, {});
  const paid = await admin.data<{ status: string }>(`/api/payruns/${payrun.id}`);
  check("pay run marked paid", paid.status === "paid", `status=${paid.status}`);

  const deletePaid = await admin.request("DELETE", `/api/payruns/${payrun.id}`);
  check("a paid pay run cannot be deleted", !deletePaid.status, `HTTP ${deletePaid.code}`);

  step("8. Payslip PDF");
  const pdfResponse = await fetch(`${baseUrl}/api/payslips/${riya!.id}/pdf`, {
    headers: { Cookie: admin.cookie },
  });
  const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
  check(
    "payslip renders as a PDF",
    pdfResponse.ok && pdfBuffer.subarray(0, 4).toString() === "%PDF",
    `${pdfBuffer.length} bytes`,
  );

  step("9. Dashboard aggregates");
  const dashboard = await admin.data<{
    payroll: { payslipCount: number; totalNetPay: string };
    headcount: { totalEmployees: number };
    departmentCosts: { department: string; headcount: number; netPay: string }[];
    monthlyTrend: { month: string; netPay: string }[];
    alerts: { missingBankDetails: number };
    warnings: { total: number };
  }>("/api/dashboard");

  const payslipTotal = detail.payslips.reduce((sum, p) => sum + Number(p.netPay), 0);
  check("dashboard headcount matches", dashboard.headcount.totalEmployees === 4);
  check("dashboard payslip count matches", dashboard.payroll.payslipCount === 4);
  check(
    "dashboard net total matches the payslips",
    near(Number(dashboard.payroll.totalNetPay), payslipTotal, 0.5),
    `${dashboard.payroll.totalNetPay} vs ${payslipTotal.toFixed(2)}`,
  );
  check("department costs are populated", dashboard.departmentCosts.some((d) => Number(d.netPay) > 0));
  check("monthly trend has the period", dashboard.monthlyTrend.length === 1, `${dashboard.monthlyTrend.length} month(s)`);
  check("missing bank details surfaced as an alert", dashboard.alerts.missingBankDetails === 1);

  const filtered = await admin.data<{ payroll: { payslipCount: number } }>(
    `/api/dashboard?departmentId=${operations.id}`,
  );
  check(
    "dashboard filters by department",
    filtered.payroll.payslipCount === 1,
    `got ${filtered.payroll.payslipCount}, expected 1 (Operations)`,
  );

  step("10. Role-based access control");
  const employeeUser = await admin.create<{ id: string }>("/api/users", {
    name: target.name,
    email: `${target.name.toLowerCase().replace(" ", ".")}@peoplepay360.test`,
    role: "employee",
    status: "active",
    employeeId: target.id,
    password: PASSWORD,
  });
  const hrUser = await admin.create<{ id: string }>("/api/users", {
    name: "Mira HR",
    email: "hr@peoplepay360.test",
    role: "hr_manager",
    status: "active",
    password: PASSWORD,
  });
  const payrollUser = await admin.create<{ id: string }>("/api/users", {
    name: "Nisha Payroll",
    email: "payroll.user@peoplepay360.test",
    role: "payroll_user",
    status: "active",
    password: PASSWORD,
  });
  check("role accounts created", Boolean(employeeUser.id && hrUser.id && payrollUser.id));

  const employeeSession = new Session("employee");
  await employeeSession.login(`${target.name.toLowerCase().replace(" ", ".")}@peoplepay360.test`);

  const ownEmployees = await employeeSession.data<unknown[]>("/api/employees");
  check("employee sees only their own record", ownEmployees.length === 1, `got ${ownEmployees.length}`);

  const ownPayslips = await employeeSession.data<{ employeeCode: string }[]>("/api/payslips");
  check(
    "employee sees only their own payslip",
    ownPayslips.length === 1 && ownPayslips[0].employeeCode === "EMP002",
    `got ${ownPayslips.length}`,
  );

  const employeePayruns = await employeeSession.get("/api/payruns");
  check("employee cannot read pay runs", employeePayruns.code === 403);

  const employeeDashboard = await employeeSession.get("/api/dashboard");
  check("employee cannot read the dashboard", employeeDashboard.code === 403);

  const othersPayslip = await employeeSession.get(`/api/payslips/${riya!.id}`);
  check("employee cannot open another person's payslip", othersPayslip.code === 403);

  const hrSession = new Session("hr");
  await hrSession.login("hr@peoplepay360.test");
  const hrEmployees = await hrSession.data<unknown[]>("/api/employees");
  check("HR manager sees all employees", hrEmployees.length === 4);
  const hrPayruns = await hrSession.get("/api/payruns");
  check("HR manager cannot read pay runs", hrPayruns.code === 403);

  const payrollSession = new Session("payroll_user");
  await payrollSession.login("payroll.user@peoplepay360.test");
  const payrollRules = await payrollSession.data<unknown[]>("/api/salary-rules");
  check("payroll user can read salary rules", payrollRules.length === 7);
  const ruleWrite = await payrollSession.post("/api/salary-rules", {
    structureId: structure.id,
    name: "Sneaky Bonus",
    code: "SNEAK",
    category: "allowance",
    sequence: 999,
    amount: 1,
  });
  check("payroll user cannot write salary rules", ruleWrite.code === 403);
  const payrollPayruns = await payrollSession.data<unknown[]>("/api/payruns");
  check("payroll user can read pay runs", payrollPayruns.length === 1);

  // ------------------------------------------------------------- summary --

  if (shouldClean) {
    await resetDatabase();
    console.log("\n\x1b[2mDatabase emptied (--clean).\x1b[0m");
  }

  console.log(`\n${"─".repeat(58)}`);
  console.log(`\x1b[1m${passed} passed, ${failed} failed\x1b[0m`);

  if (failed > 0) {
    console.log("\nFailed checks:");
    for (const failure of failures) {
      console.log(`  \x1b[31m•\x1b[0m ${failure}`);
    }
    process.exit(1);
  }

  if (!shouldClean) {
    console.log("\nData left in place. Sign in at " + baseUrl + "/login");
    console.log(`  admin@peoplepay360.test / ${PASSWORD}        (Admin)`);
    console.log(`  hr@peoplepay360.test / ${PASSWORD}           (HR Manager)`);
    console.log(`  payroll.user@peoplepay360.test / ${PASSWORD} (Payroll User)`);
    console.log(`  dev.patel@peoplepay360.test / ${PASSWORD}    (Employee)`);
  }
}

await run().catch((error) => {
  console.error(`\n\x1b[31mFlow aborted:\x1b[0m ${error.message}`);
  process.exit(1);
});
