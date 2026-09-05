/**
 * Adds a non-destructive payroll demo dataset to an existing workspace.
 *
 * It removes only records created by this script (Demo Payroll / PP360 demo
 * codes), then recreates payroll master data, attendance, leave, payslips,
 * warnings, and payments for the selected organization.
 */
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@peoplepay360.test";

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(databaseUrl);

type IdRow = { id: string };
type AdminRow = {
  id: string;
  organization_id: string | null;
  organization_name: string;
};
type OrganizationRow = { id: string; name: string };

type DemoEmployee = {
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  departmentCode: string;
  wage: number;
  hasBank: boolean;
};

const periodStart = "2026-08-01";
const periodEnd = "2026-08-31";
const yearStart = "2026-01-01";
const yearEnd = "2026-12-31";
const demoEmployeeCodes = [
  "PP360-101",
  "PP360-102",
  "PP360-103",
  "PP360-104",
  "PP360-105",
];

const departments = [
  { code: "DEMO-ENG", name: "Demo Engineering" },
  { code: "DEMO-OPS", name: "Demo Operations" },
  { code: "DEMO-FIN", name: "Demo Finance" },
];

const people: DemoEmployee[] = [
  {
    code: "PP360-101",
    firstName: "Anaya",
    lastName: "Rao",
    email: "anaya.rao@peoplepay360.test",
    title: "Payroll Manager",
    departmentCode: "DEMO-FIN",
    wage: 125000,
    hasBank: true,
  },
  {
    code: "PP360-102",
    firstName: "Dev",
    lastName: "Mehta",
    email: "dev.mehta@peoplepay360.test",
    title: "Backend Engineer",
    departmentCode: "DEMO-ENG",
    wage: 90000,
    hasBank: true,
  },
  {
    code: "PP360-103",
    firstName: "Kavya",
    lastName: "Nair",
    email: "kavya.nair@peoplepay360.test",
    title: "Operations Analyst",
    departmentCode: "DEMO-OPS",
    wage: 65000,
    hasBank: true,
  },
  {
    code: "PP360-104",
    firstName: "Ishaan",
    lastName: "Gupta",
    email: "ishaan.gupta@peoplepay360.test",
    title: "QA Engineer",
    departmentCode: "DEMO-ENG",
    wage: 52000,
    hasBank: false,
  },
  {
    code: "PP360-105",
    firstName: "Omar",
    lastName: "Sheikh",
    email: "omar.sheikh@peoplepay360.test",
    title: "Support Lead",
    departmentCode: "DEMO-OPS",
    wage: 72000,
    hasBank: true,
  },
];

const salaryRules = [
  { name: "Basic Salary", code: "BASIC", category: "basic", sequence: 10, amount: 50, base: "WAGE" },
  { name: "House Rent Allowance", code: "HRA", category: "allowance", sequence: 20, amount: 40, base: "BASIC" },
  { name: "Conveyance Allowance", code: "CONV", category: "allowance", sequence: 30, amount: 1600, base: null },
  { name: "Gross Salary", code: "GROSS", category: "gross", sequence: 50, amount: 0, base: null },
  { name: "Provident Fund", code: "PF", category: "deduction", sequence: 70, amount: 12, base: "BASIC" },
  { name: "Professional Tax", code: "PT", category: "deduction", sequence: 80, amount: 200, base: null },
  { name: "Net Salary", code: "NET", category: "net", sequence: 100, amount: 0, base: null },
];

const statutorySettings = [
  { component: "pf", code: "PF_EMPLOYEE", name: "PF Employee Rate (%)", rate: "12.00", fixedAmount: null },
  { component: "pf", code: "EPS_RATE", name: "EPS Rate (%)", rate: "8.33", fixedAmount: null },
  { component: "pf", code: "PF_EMPLOYER", name: "PF Employer Rate (%)", rate: "3.67", fixedAmount: null },
  { component: "pf", code: "EDLI_RATE", name: "EDLI Rate (%)", rate: "0.50", fixedAmount: null },
  { component: "pf", code: "PF_ADMIN", name: "PF Admin Rate (%)", rate: "0.50", fixedAmount: null },
  { component: "pf", code: "PF_WAGE_LIMIT", name: "PF Wage Limit", rate: null, fixedAmount: "15000.00" },
  { component: "esi", code: "ESIC_EMPLOYEE", name: "ESIC Employee Rate (%)", rate: "0.75", fixedAmount: null },
  { component: "esi", code: "ESIC_EMPLOYER", name: "ESIC Employer Rate (%)", rate: "3.25", fixedAmount: null },
  { component: "esi", code: "ESIC_WAGE_LIMIT", name: "ESIC Wage Limit", rate: null, fixedAmount: "21000.00" },
  { component: "professional_tax", code: "PROFESSIONAL_TAX", name: "Professional Tax", rate: null, fixedAmount: "200.00" },
];

function money(amount: number) {
  return (Math.round(amount * 100) / 100).toFixed(2);
}

function weekdaysInPeriod() {
  const dates: string[] = [];
  const cursor = new Date(`${periodStart}T00:00:00.000Z`);
  const end = new Date(`${periodEnd}T00:00:00.000Z`);

  while (cursor <= end) {
    const day = cursor.getUTCDay();

    if (day >= 1 && day <= 5) {
      dates.push(cursor.toISOString().slice(0, 10));
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function payrollLines(fullWage: number, ratio: number) {
  const wage = fullWage * ratio;
  const basic = wage * 0.5;
  const hra = basic * 0.4;
  const conveyance = 1600;
  const gross = basic + hra + conveyance;
  const pf = basic * 0.12;
  const professionalTax = 200;
  const net = gross - pf - professionalTax;

  return [
    { name: "Basic Salary", code: "BASIC", category: "basic", sequence: 10, amount: basic },
    { name: "House Rent Allowance", code: "HRA", category: "allowance", sequence: 20, amount: hra },
    { name: "Conveyance Allowance", code: "CONV", category: "allowance", sequence: 30, amount: conveyance },
    { name: "Gross Salary", code: "GROSS", category: "gross", sequence: 50, amount: gross },
    { name: "Provident Fund", code: "PF", category: "deduction", sequence: 70, amount: pf },
    { name: "Professional Tax", code: "PT", category: "deduction", sequence: 80, amount: professionalTax },
    { name: "Net Salary", code: "NET", category: "net", sequence: 100, amount: net },
  ];
}

async function one<T extends IdRow>(query: Promise<unknown>) {
  const rows = (await query) as T[];

  if (!rows[0]) {
    throw new Error("Expected one row, got none");
  }

  return rows[0];
}

async function cleanup(organizationId: string) {
  await sql`
    delete from payruns
    where organization_id = ${organizationId}
      and name like 'Demo Payroll %'
  `;

  for (const code of demoEmployeeCodes) {
    await sql`
      delete from employees
      where organization_id = ${organizationId}
        and employee_code = ${code}
    `;
  }

  await sql`
    delete from salary_structures
    where organization_id = ${organizationId}
      and code = 'DEMO_REGULAR'
  `;

  await sql`
    delete from time_off_types
    where organization_id = ${organizationId}
      and code = 'DEMO_EL'
  `;

  await sql`
    delete from working_schedules
    where organization_id = ${organizationId}
      and name = 'Demo Standard 40 Hours'
  `;

  for (const department of departments) {
    await sql`
      delete from departments
      where organization_id = ${organizationId}
        and code = ${department.code}
    `;
  }
}

async function run() {
  let [adminByEmail] = (await sql`
    select u.id, u.organization_id, o.name as organization_name
    from users u
    left join organizations o on o.id = u.organization_id
    where u.email = ${adminEmail}
      and u.role = 'admin'
    limit 1
  `) as AdminRow[];

  const [fallbackAdmin] = adminByEmail
    ? []
    : ((await sql`
        select u.id, u.organization_id, o.name as organization_name
        from users u
        left join organizations o on o.id = u.organization_id
        where u.role = 'admin'
          and u.organization_id is not null
        order by u.created_at desc
        limit 1
      `) as AdminRow[]);

  if (adminByEmail && !adminByEmail.organization_id) {
    const emailDomain = adminEmail.split("@")[1] ?? "";
    const [organization] = (await sql`
      select id, name
      from organizations
      where email_domain = ${emailDomain}
      order by created_at
      limit 1
    `) as OrganizationRow[];

    if (organization) {
      await sql`
        update users
        set organization_id = ${organization.id}
        where id = ${adminByEmail.id}
      `;

      adminByEmail = {
        ...adminByEmail,
        organization_id: organization.id,
        organization_name: organization.name,
      };
    }
  }

  const linkedAdmin = adminByEmail ?? fallbackAdmin;

  if (!linkedAdmin?.organization_id) {
    throw new Error(
      `No admin workspace found. Sign up first or set SEED_ADMIN_EMAIL. Tried ${adminEmail}.`,
    );
  }

  const admin = linkedAdmin;
  const organizationId = admin.organization_id;

  if (!organizationId) {
    throw new Error("Admin is not linked to an organization");
  }

  console.log(`Seeding payroll demo data for ${admin.organization_name}`);
  await cleanup(organizationId);

  const departmentIds = new Map<string, string>();

  for (const department of departments) {
    const row = await one(sql`
      insert into departments (organization_id, name, code)
      values (${organizationId}, ${department.name}, ${department.code})
      returning id
    `);
    departmentIds.set(department.code, row.id);
  }

  const schedule = await one(sql`
    insert into working_schedules (
      organization_id,
      name,
      working_days,
      start_time,
      end_time,
      break_duration_minutes,
      weekly_hours,
      status
    )
    values (
      ${organizationId},
      'Demo Standard 40 Hours',
      '1,2,3,4,5',
      '09:00',
      '18:00',
      60,
      '40.00',
      'active'
    )
    returning id
  `);

  for (const dayOfWeek of [1, 2, 3, 4, 5]) {
    await sql`
      insert into working_schedule_lines (
        schedule_id,
        day_of_week,
        start_time,
        end_time,
        break_minutes
      )
      values (${schedule.id}, ${dayOfWeek}, '09:00', '18:00', 60)
    `;
  }

  const structure = await one(sql`
    insert into salary_structures (organization_id, name, code, is_active)
    values (${organizationId}, 'Demo Regular Salary', 'DEMO_REGULAR', true)
    returning id
  `);

  for (const rule of salaryRules) {
    await sql`
      insert into salary_rules (
        structure_id,
        name,
        code,
        category,
        sequence,
        amount,
        percentage_base_code
      )
      values (
        ${structure.id},
        ${rule.name},
        ${rule.code},
        ${rule.category},
        ${rule.sequence},
        ${money(rule.amount)},
        ${rule.base}
      )
    `;
  }

  for (const setting of statutorySettings) {
    await sql`
      insert into statutory_settings (
        organization_id,
        component,
        code,
        name,
        rate,
        fixed_amount,
        effective_from,
        effective_to,
        is_active
      )
      values (
        ${organizationId},
        ${setting.component},
        ${setting.code},
        ${setting.name},
        ${setting.rate},
        ${setting.fixedAmount},
        '2026-04-01',
        null,
        true
      )
      on conflict (organization_id, code)
      do update set
        component = excluded.component,
        name = excluded.name,
        rate = excluded.rate,
        fixed_amount = excluded.fixed_amount,
        effective_from = excluded.effective_from,
        effective_to = excluded.effective_to,
        is_active = excluded.is_active
    `;
  }

  const employeeIds = new Map<string, string>();
  const contractIds = new Map<string, string>();
  const bankIds = new Map<string, string>();

  for (const person of people) {
    const departmentId = departmentIds.get(person.departmentCode);

    if (!departmentId) {
      throw new Error(`Missing department ${person.departmentCode}`);
    }

    const employee = await one(sql`
      insert into employees (
        organization_id,
        employee_code,
        first_name,
        last_name,
        work_email,
        department_id,
        job_title,
        status,
        hire_date
      )
      values (
        ${organizationId},
        ${person.code},
        ${person.firstName},
        ${person.lastName},
        ${person.email},
        ${departmentId},
        ${person.title},
        'active',
        ${yearStart}
      )
      returning id
    `);

    employeeIds.set(person.code, employee.id);

    await sql`
      insert into employee_working_schedules (
        employee_id,
        schedule_id,
        effective_from,
        effective_to
      )
      values (${employee.id}, ${schedule.id}, ${yearStart}, null)
    `;

    const contract = await one(sql`
      insert into contracts (
        employee_id,
        start_date,
        end_date,
        status,
        monthly_wage,
        currency,
        salary_structure_id,
        approved_by,
        approved_at,
        notes
      )
      values (
        ${employee.id},
        ${yearStart},
        null,
        'active',
        ${money(person.wage)},
        'INR',
        ${structure.id},
        ${admin.id},
        now(),
        'Demo payroll contract'
      )
      returning id
    `);

    contractIds.set(person.code, contract.id);

    if (person.hasBank) {
      const bank = await one(sql`
        insert into employee_bank_accounts (
          employee_id,
          account_holder_name,
          bank_name,
          account_number_masked,
          ifsc_code,
          is_primary
        )
        values (
          ${employee.id},
          ${`${person.firstName} ${person.lastName}`},
          'HDFC Bank',
          ${`XXXXXX${person.code.slice(-3)}`},
          'HDFC0001234',
          true
        )
        returning id
      `);
      bankIds.set(person.code, bank.id);
    }
  }

  const earnedLeave = await one(sql`
    insert into time_off_types (
      organization_id,
      name,
      code,
      unit,
      requires_allocation,
      requires_approval,
      is_paid,
      affects_payroll,
      color_hex,
      is_active
    )
    values (
      ${organizationId},
      'Demo Earned Leave',
      'DEMO_EL',
      'days',
      true,
      true,
      true,
      true,
      '#111827',
      true
    )
    returning id
  `);

  const devId = employeeIds.get("PP360-102");

  if (!devId) {
    throw new Error("Missing Dev demo employee");
  }

  const allocation = await one(sql`
    insert into leave_allocations (
      employee_id,
      time_off_type_id,
      allocated_days,
      consumed_days,
      status,
      valid_from,
      valid_to,
      notes,
      approved_by,
      approved_at
    )
    values (
      ${devId},
      ${earnedLeave.id},
      '12.00',
      '2.00',
      'approved',
      ${yearStart},
      ${yearEnd},
      'Demo annual leave allocation',
      ${admin.id},
      now()
    )
    returning id
  `);

  const workdays = weekdaysInPeriod();
  const leaveDays = workdays.slice(5, 7);
  const absentDay = workdays[3];
  const halfDay = workdays[10];

  await sql`
    insert into time_off_requests (
      employee_id,
      type_name,
      time_off_type_id,
      allocation_id,
      start_date,
      end_date,
      duration_days,
      status,
      reason,
      reviewed_by,
      reviewed_at
    )
    values (
      ${devId},
      'Demo Earned Leave',
      ${earnedLeave.id},
      ${allocation.id},
      ${leaveDays[0]},
      ${leaveDays[1]},
      '2.00',
      'approved',
      'Demo paid leave for payroll proration',
      ${admin.id},
      now()
    )
  `;

  for (const date of workdays) {
    for (const person of people) {
      const employeeId = employeeIds.get(person.code);

      if (!employeeId) {
        throw new Error(`Missing employee ${person.code}`);
      }

      if (person.code === "PP360-102" && leaveDays.includes(date)) {
        continue;
      }

      const isAbsent = person.code === "PP360-103" && date === absentDay;
      const isHalfDay = person.code === "PP360-105" && date === halfDay;
      const status = isAbsent ? "absent" : isHalfDay ? "half_day" : "present";
      const checkIn = isAbsent ? null : `${date}T09:00:00.000Z`;
      const checkOut = isAbsent || isHalfDay ? null : `${date}T18:00:00.000Z`;
      const workedHours = isAbsent ? "0.00" : isHalfDay ? "4.00" : "8.00";

      await sql`
        insert into attendance_records (
          employee_id,
          attendance_date,
          check_in,
          check_out,
          worked_hours,
          status
        )
        values (
          ${employeeId},
          ${date},
          ${checkIn},
          ${checkOut},
          ${workedHours},
          ${status}
        )
      `;
    }
  }

  const paidPayrun = await one(sql`
    insert into payruns (
      organization_id,
      name,
      period_start,
      period_end,
      salary_structure_id,
      status,
      created_by,
      validated_by,
      validated_at,
      paid_by,
      paid_at
    )
    values (
      ${organizationId},
      'Demo Payroll Aug 2026 - Paid',
      ${periodStart},
      ${periodEnd},
      ${structure.id},
      'paid',
      ${admin.id},
      ${admin.id},
      now(),
      ${admin.id},
      now()
    )
    returning id
  `);

  const draftPayrun = await one(sql`
    insert into payruns (
      organization_id,
      name,
      period_start,
      period_end,
      salary_structure_id,
      status,
      created_by
    )
    values (
      ${organizationId},
      'Demo Payroll Aug 2026 - To Process',
      ${periodStart},
      ${periodEnd},
      ${structure.id},
      'draft',
      ${admin.id}
    )
    returning id
  `);

  for (const person of people) {
    const employeeId = employeeIds.get(person.code);

    if (!employeeId) {
      throw new Error(`Missing employee ${person.code}`);
    }

    await sql`
      insert into payrun_employees (payrun_id, employee_id)
      values (${paidPayrun.id}, ${employeeId}), (${draftPayrun.id}, ${employeeId})
    `;
  }

  let totalNetPay = 0;

  for (const person of people) {
    const employeeId = employeeIds.get(person.code);
    const contractId = contractIds.get(person.code);

    if (!employeeId || !contractId) {
      throw new Error(`Missing payroll link for ${person.code}`);
    }

    const workedDays =
      person.code === "PP360-102"
        ? workdays.length - 2
        : person.code === "PP360-103"
          ? workdays.length - 1
          : person.code === "PP360-105"
            ? workdays.length - 0.5
            : workdays.length;
    const paidLeaveDays = person.code === "PP360-102" ? 2 : 0;
    const ratio = Math.min((workedDays + paidLeaveDays) / workdays.length, 1);
    const lines = payrollLines(person.wage, ratio);
    const gross = lines
      .filter((line) => ["basic", "allowance", "earning"].includes(line.category))
      .reduce((sum, line) => sum + line.amount, 0);
    const deductions = lines
      .filter((line) => line.category === "deduction")
      .reduce((sum, line) => sum + line.amount, 0);
    const net = lines.find((line) => line.category === "net")?.amount ?? gross - deductions;
    totalNetPay += net;

    const payslip = await one(sql`
      insert into payslips (
        payrun_id,
        employee_id,
        contract_id,
        worked_days,
        leave_days,
        gross_pay,
        total_deductions,
        net_pay,
        status
      )
      values (
        ${paidPayrun.id},
        ${employeeId},
        ${contractId},
        ${money(workedDays)},
        ${money(person.code === "PP360-102" ? 2 : 0)},
        ${money(gross)},
        ${money(deductions)},
        ${money(net)},
        'computed'
      )
      returning id
    `);

    for (const line of lines) {
      await sql`
        insert into payslip_lines (
          payslip_id,
          name,
          code,
          category,
          sequence,
          amount
        )
        values (
          ${payslip.id},
          ${line.name},
          ${line.code},
          ${line.category},
          ${line.sequence},
          ${money(line.amount)}
        )
      `;
    }

    if (!person.hasBank) {
      await sql`
        insert into payroll_warnings (payrun_id, employee_id, code, message)
        values (
          ${paidPayrun.id},
          ${employeeId},
          'MISSING_BANK_DETAILS',
          ${`${person.firstName} ${person.lastName} has no bank account on file and cannot be paid.`}
        )
      `;
    }

    if (person.code === "PP360-105") {
      await sql`
        insert into payroll_warnings (payrun_id, employee_id, code, message)
        values (
          ${paidPayrun.id},
          ${employeeId},
          'MISSING_CHECKOUT',
          'Omar Sheikh has 1 attendance record without a check-out.'
        )
      `;
    }
  }

  const batch = await one(sql`
    insert into payment_batches (
      payrun_id,
      status,
      total_amount,
      created_by,
      approved_by,
      paid_at
    )
    values (
      ${paidPayrun.id},
      'paid',
      ${money(totalNetPay)},
      ${admin.id},
      ${admin.id},
      now()
    )
    returning id
  `);

  for (const person of people) {
    const employeeId = employeeIds.get(person.code);

    if (!employeeId) {
      throw new Error(`Missing employee ${person.code}`);
    }

    const [payslip] = (await sql`
      select id, net_pay
      from payslips
      where payrun_id = ${paidPayrun.id}
        and employee_id = ${employeeId}
      limit 1
    `) as { id: string; net_pay: string }[];
    const bankId = bankIds.get(person.code) ?? null;
    const status = bankId ? "paid" : "failed";

    await sql`
      insert into payment_transactions (
        batch_id,
        employee_id,
        payslip_id,
        bank_account_id,
        amount,
        status,
        reference_number,
        failure_reason,
        processed_at
      )
      values (
        ${batch.id},
        ${employeeId},
        ${payslip.id},
        ${bankId},
        ${payslip.net_pay},
        ${status},
        ${bankId ? `DEMO-UTR-${person.code}` : null},
        ${bankId ? null : "Missing bank account"},
        now()
      )
    `;
  }

  await sql`
    insert into audit_logs (
      actor_user_id,
      action,
      entity_type,
      entity_id,
      summary
    )
    values (
      ${admin.id},
      'create',
      'payrun',
      ${paidPayrun.id},
      'Seeded demo payroll data'
    )
  `;

  console.log("Done.");
  console.log(`Admin: ${adminEmail}`);
  console.log(`Period: ${periodStart} to ${periodEnd}`);
  console.log(`Employees: ${people.length}`);
  console.log("Paid payrun: Demo Payroll Aug 2026 - Paid");
  console.log("Draft payrun: Demo Payroll Aug 2026 - To Process");
  console.log("Expected warnings: missing bank details, missing checkout");
}

await run();
