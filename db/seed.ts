import "dotenv/config";
import { db } from ".";
import {
  attendanceRecords,
  contracts,
  departments,
  employees,
  payrunEmployees,
  payrollWarnings,
  payruns,
  payslipLines,
  payslips,
  salaryRules,
  salaryStructures,
  timeOffRequests,
  users,
} from "./schema";

const ids = {
  admin: "11111111-1111-4111-8111-111111111111",
  hr: "11111111-1111-4111-8111-111111111112",
  payroll: "11111111-1111-4111-8111-111111111113",
  engineering: "22222222-2222-4222-8222-222222222221",
  operations: "22222222-2222-4222-8222-222222222222",
  structure: "33333333-3333-4333-8333-333333333331",
  payrun: "44444444-4444-4444-8444-444444444441",
};

const employeeIds = [
  "55555555-5555-4555-8555-555555555551",
  "55555555-5555-4555-8555-555555555552",
  "55555555-5555-4555-8555-555555555553",
  "55555555-5555-4555-8555-555555555554",
  "55555555-5555-4555-8555-555555555555",
];

const contractIds = [
  "66666666-6666-4666-8666-666666666661",
  "66666666-6666-4666-8666-666666666662",
  "66666666-6666-4666-8666-666666666663",
  "66666666-6666-4666-8666-666666666664",
  "66666666-6666-4666-8666-666666666665",
];

const payslipIds = [
  "77777777-7777-4777-8777-777777777771",
  "77777777-7777-4777-8777-777777777772",
  "77777777-7777-4777-8777-777777777773",
  "77777777-7777-4777-8777-777777777774",
  "77777777-7777-4777-8777-777777777775",
];

const wages = [90000, 72000, 68000, 76000, 52000];

async function clearDatabase() {
  await db.delete(payrollWarnings);
  await db.delete(payslipLines);
  await db.delete(payslips);
  await db.delete(payrunEmployees);
  await db.delete(payruns);
  await db.delete(timeOffRequests);
  await db.delete(attendanceRecords);
  await db.delete(contracts);
  await db.delete(salaryRules);
  await db.delete(salaryStructures);
  await db.delete(employees);
  await db.delete(departments);
  await db.delete(users);
}

async function seed() {
  await clearDatabase();

  await db.insert(users).values([
    {
      id: ids.admin,
      name: "Aarav Admin",
      email: "admin@peoplepay360.test",
      role: "admin",
    },
    {
      id: ids.hr,
      name: "Mira HR",
      email: "hr@peoplepay360.test",
      role: "hr_manager",
    },
    {
      id: ids.payroll,
      name: "Kabir Payroll",
      email: "payroll@peoplepay360.test",
      role: "payroll_manager",
    },
  ]);

  await db.insert(departments).values([
    { id: ids.engineering, name: "Engineering", code: "ENG" },
    { id: ids.operations, name: "Operations", code: "OPS" },
  ]);

  await db.insert(salaryStructures).values({
    id: ids.structure,
    name: "Regular Salary",
    code: "REGULAR",
  });

  await db.insert(salaryRules).values([
    {
      structureId: ids.structure,
      name: "Basic Salary",
      code: "BASIC",
      category: "earning",
      sequence: 10,
      amount: "50.00",
      percentageBaseCode: "WAGE",
    },
    {
      structureId: ids.structure,
      name: "House Rent Allowance",
      code: "HRA",
      category: "earning",
      sequence: 20,
      amount: "20.00",
      percentageBaseCode: "WAGE",
    },
    {
      structureId: ids.structure,
      name: "Provident Fund",
      code: "PF",
      category: "deduction",
      sequence: 70,
      amount: "12.00",
      percentageBaseCode: "BASIC",
    },
    {
      structureId: ids.structure,
      name: "Professional Tax",
      code: "PT",
      category: "deduction",
      sequence: 80,
      amount: "200.00",
    },
    {
      structureId: ids.structure,
      name: "Net Pay",
      code: "NET",
      category: "net",
      sequence: 100,
      amount: "0.00",
    },
  ]);

  await db.insert(employees).values([
    {
      id: employeeIds[0],
      employeeCode: "EMP001",
      firstName: "Riya",
      lastName: "Shah",
      workEmail: "riya.shah@peoplepay360.test",
      departmentId: ids.engineering,
      jobTitle: "Software Developer",
      hireDate: "2024-04-01",
    },
    {
      id: employeeIds[1],
      employeeCode: "EMP002",
      firstName: "Dev",
      lastName: "Patel",
      workEmail: "dev.patel@peoplepay360.test",
      departmentId: ids.engineering,
      jobTitle: "Software Developer",
      managerId: employeeIds[0],
      hireDate: "2023-11-15",
    },
    {
      id: employeeIds[2],
      employeeCode: "EMP003",
      firstName: "Anaya",
      lastName: "Mehta",
      workEmail: "anaya.mehta@peoplepay360.test",
      departmentId: ids.engineering,
      jobTitle: "Product Designer",
      managerId: employeeIds[0],
      hireDate: "2025-01-06",
    },
    {
      id: employeeIds[3],
      employeeCode: "EMP004",
      firstName: "Kabir",
      lastName: "Rao",
      workEmail: "kabir.rao@peoplepay360.test",
      departmentId: ids.operations,
      jobTitle: "HR Executive",
      hireDate: "2022-08-22",
    },
    {
      id: employeeIds[4],
      employeeCode: "EMP005",
      firstName: "Meera",
      lastName: "Nair",
      workEmail: "meera.nair@peoplepay360.test",
      departmentId: ids.operations,
      jobTitle: "Payroll Associate",
      managerId: employeeIds[3],
      hireDate: "2024-09-02",
    },
  ]);

  await db.insert(contracts).values(
    employeeIds.map((employeeId, index) => ({
      id: contractIds[index],
      employeeId,
      startDate: "2026-04-01",
      status: "active" as const,
      monthlyWage: wages[index].toFixed(2),
      salaryStructureId: ids.structure,
    })),
  );

  await db.insert(timeOffRequests).values([
    {
      employeeId: employeeIds[1],
      typeName: "Earned Leave",
      startDate: "2026-09-10",
      endDate: "2026-09-10",
      durationDays: "1.00",
      status: "approved",
      reason: "Personal work",
    },
    {
      employeeId: employeeIds[4],
      typeName: "Earned Leave",
      startDate: "2026-09-17",
      endDate: "2026-09-18",
      durationDays: "2.00",
      status: "submitted",
      reason: "Family event",
    },
  ]);

  await db.insert(attendanceRecords).values(
    employeeIds.flatMap((employeeId, employeeIndex) =>
      ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"].map(
        (attendanceDate, dayIndex) => ({
          employeeId,
          attendanceDate,
          checkIn: new Date(
            `${attendanceDate}T09:${employeeIndex === 2 && dayIndex === 1 ? "58" : "28"}:00+05:30`,
          ),
          checkOut: new Date(`${attendanceDate}T18:30:00+05:30`),
          workedHours:
            employeeIndex === 2 && dayIndex === 1 ? "7.50" : "8.00",
          status:
            employeeIndex === 2 && dayIndex === 1
              ? ("late" as const)
              : ("present" as const),
        }),
      ),
    ),
  );

  await db.insert(payruns).values({
    id: ids.payrun,
    name: "September 2026 Payroll",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    salaryStructureId: ids.structure,
    status: "computed",
  });

  await db.insert(payrunEmployees).values(
    employeeIds.map((employeeId) => ({
      payrunId: ids.payrun,
      employeeId,
    })),
  );

  await db.insert(payslips).values(
    employeeIds.map((employeeId, index) => {
      const basic = wages[index] * 0.5;
      const hra = wages[index] * 0.2;
      const gross = basic + hra;
      const deductions = basic * 0.12 + 200;
      const net = gross - deductions;

      return {
        id: payslipIds[index],
        payrunId: ids.payrun,
        employeeId,
        contractId: contractIds[index],
        workedDays: index === 1 ? "21.00" : "22.00",
        leaveDays: index === 1 ? "1.00" : "0.00",
        grossPay: gross.toFixed(2),
        totalDeductions: deductions.toFixed(2),
        netPay: net.toFixed(2),
        status: "computed" as const,
      };
    }),
  );

  await db.insert(payslipLines).values(
    payslipIds.flatMap((payslipId, index) => {
      const basic = wages[index] * 0.5;
      const hra = wages[index] * 0.2;
      const pf = basic * 0.12;
      const net = basic + hra - pf - 200;

      return [
        {
          payslipId,
          name: "Basic Salary",
          code: "BASIC",
          category: "earning" as const,
          sequence: 10,
          amount: basic.toFixed(2),
        },
        {
          payslipId,
          name: "House Rent Allowance",
          code: "HRA",
          category: "earning" as const,
          sequence: 20,
          amount: hra.toFixed(2),
        },
        {
          payslipId,
          name: "Provident Fund",
          code: "PF",
          category: "deduction" as const,
          sequence: 70,
          amount: pf.toFixed(2),
        },
        {
          payslipId,
          name: "Professional Tax",
          code: "PT",
          category: "deduction" as const,
          sequence: 80,
          amount: "200.00",
        },
        {
          payslipId,
          name: "Net Pay",
          code: "NET",
          category: "net" as const,
          sequence: 100,
          amount: net.toFixed(2),
        },
      ];
    }),
  );

  await db.insert(payrollWarnings).values([
    {
      payrunId: ids.payrun,
      employeeId: employeeIds[2],
      code: "LATE_ATTENDANCE",
      message: "One late attendance entry found in this payroll period.",
    },
    {
      payrunId: ids.payrun,
      employeeId: employeeIds[4],
      code: "PENDING_LEAVE",
      message: "Employee has a leave request pending approval.",
    },
  ]);

  console.log("Seed complete: PeoplePay360 review demo data is ready.");
}

seed().catch((error) => {
  console.error("Seed failed");
  console.error(error);
  process.exit(1);
});
