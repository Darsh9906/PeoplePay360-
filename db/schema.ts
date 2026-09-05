import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "employee",
  "hr_manager",
  "payroll_user",
  "payroll_manager",
  "admin",
]);

export const employeeStatusEnum = pgEnum("employee_status", [
  "active",
  "inactive",
  "terminated",
]);

export const contractStatusEnum = pgEnum("contract_status", [
  "active",
  "expired",
  "terminated",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "late",
  "absent",
  "half_day",
]);

export const requestStatusEnum = pgEnum("request_status", [
  "submitted",
  "approved",
  "refused",
]);

export const payrunStatusEnum = pgEnum("payrun_status", [
  "draft",
  "computed",
  "validated",
  "paid",
]);

export const salaryRuleCategoryEnum = pgEnum("salary_rule_category", [
  "earning",
  "deduction",
  "net",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 140 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    role: userRoleEnum("role").notNull().default("employee"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  }),
);

export const departments = pgTable("departments", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  code: varchar("code", { length: 30 }).notNull(),
});

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeCode: varchar("employee_code", { length: 30 }).notNull(),
    userId: uuid("user_id").references(() => users.id),
    firstName: varchar("first_name", { length: 80 }).notNull(),
    lastName: varchar("last_name", { length: 80 }).notNull(),
    workEmail: varchar("work_email", { length: 255 }).notNull(),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id),
    jobTitle: varchar("job_title", { length: 120 }).notNull(),
    managerId: uuid("manager_id"),
    status: employeeStatusEnum("status").notNull().default("active"),
    hireDate: date("hire_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    codeIdx: uniqueIndex("employees_code_idx").on(table.employeeCode),
    emailIdx: uniqueIndex("employees_work_email_idx").on(table.workEmail),
    departmentIdx: index("employees_department_idx").on(table.departmentId),
  }),
);

export const contracts = pgTable(
  "contracts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    status: contractStatusEnum("status").notNull().default("active"),
    monthlyWage: numeric("monthly_wage", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    salaryStructureId: uuid("salary_structure_id").references(
      () => salaryStructures.id,
    ),
  },
  (table) => ({
    employeeIdx: index("contracts_employee_idx").on(table.employeeId),
  }),
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    attendanceDate: date("attendance_date").notNull(),
    checkIn: timestamp("check_in", { withTimezone: true }),
    checkOut: timestamp("check_out", { withTimezone: true }),
    workedHours: numeric("worked_hours", { precision: 5, scale: 2 })
      .notNull()
      .default("0.00"),
    status: attendanceStatusEnum("status").notNull().default("present"),
  },
  (table) => ({
    employeeDateIdx: uniqueIndex("attendance_employee_date_idx").on(
      table.employeeId,
      table.attendanceDate,
    ),
  }),
);

export const timeOffRequests = pgTable(
  "time_off_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    typeName: varchar("type_name", { length: 80 }).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    durationDays: numeric("duration_days", { precision: 6, scale: 2 }).notNull(),
    status: requestStatusEnum("status").notNull().default("submitted"),
    reason: text("reason"),
  },
  (table) => ({
    employeeIdx: index("time_off_employee_idx").on(table.employeeId),
  }),
);

export const salaryStructures = pgTable("salary_structures", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  code: varchar("code", { length: 30 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const salaryRules = pgTable(
  "salary_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    structureId: uuid("structure_id")
      .notNull()
      .references(() => salaryStructures.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    code: varchar("code", { length: 30 }).notNull(),
    category: salaryRuleCategoryEnum("category").notNull(),
    sequence: integer("sequence").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    percentageBaseCode: varchar("percentage_base_code", { length: 30 }),
  },
  (table) => ({
    structureIdx: index("salary_rules_structure_idx").on(table.structureId),
  }),
);

export const payruns = pgTable("payruns", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 140 }).notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  salaryStructureId: uuid("salary_structure_id").references(
    () => salaryStructures.id,
  ),
  status: payrunStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const payrunEmployees = pgTable(
  "payrun_employees",
  {
    payrunId: uuid("payrun_id")
      .notNull()
      .references(() => payruns.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.payrunId, table.employeeId] }),
  }),
);

export const payslips = pgTable(
  "payslips",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    payrunId: uuid("payrun_id")
      .notNull()
      .references(() => payruns.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id),
    contractId: uuid("contract_id").references(() => contracts.id),
    workedDays: numeric("worked_days", { precision: 6, scale: 2 })
      .notNull()
      .default("0.00"),
    leaveDays: numeric("leave_days", { precision: 6, scale: 2 })
      .notNull()
      .default("0.00"),
    grossPay: numeric("gross_pay", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    totalDeductions: numeric("total_deductions", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    netPay: numeric("net_pay", { precision: 12, scale: 2 })
      .notNull()
      .default("0.00"),
    status: payrunStatusEnum("status").notNull().default("draft"),
  },
  (table) => ({
    payrunEmployeeIdx: uniqueIndex("payslips_payrun_employee_idx").on(
      table.payrunId,
      table.employeeId,
    ),
  }),
);

export const payslipLines = pgTable(
  "payslip_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    payslipId: uuid("payslip_id")
      .notNull()
      .references(() => payslips.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    code: varchar("code", { length: 30 }).notNull(),
    category: salaryRuleCategoryEnum("category").notNull(),
    sequence: integer("sequence").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  },
  (table) => ({
    payslipIdx: index("payslip_lines_payslip_idx").on(table.payslipId),
  }),
);

export const payrollWarnings = pgTable("payroll_warnings", {
  id: uuid("id").defaultRandom().primaryKey(),
  payrunId: uuid("payrun_id").references(() => payruns.id, {
    onDelete: "cascade",
  }),
  employeeId: uuid("employee_id").references(() => employees.id),
  code: varchar("code", { length: 80 }).notNull(),
  message: text("message").notNull(),
});

export const usersRelations = relations(users, ({ one }) => ({
  employee: one(employees, {
    fields: [users.id],
    references: [employees.userId],
  }),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  employees: many(employees),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  manager: one(employees, {
    fields: [employees.managerId],
    references: [employees.id],
    relationName: "employee_manager",
  }),
  directReports: many(employees, {
    relationName: "employee_manager",
  }),
  contracts: many(contracts),
  attendanceRecords: many(attendanceRecords),
  timeOffRequests: many(timeOffRequests),
  payslips: many(payslips),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  employee: one(employees, {
    fields: [contracts.employeeId],
    references: [employees.id],
  }),
  salaryStructure: one(salaryStructures, {
    fields: [contracts.salaryStructureId],
    references: [salaryStructures.id],
  }),
}));

export const attendanceRelations = relations(attendanceRecords, ({ one }) => ({
  employee: one(employees, {
    fields: [attendanceRecords.employeeId],
    references: [employees.id],
  }),
}));

export const timeOffRelations = relations(timeOffRequests, ({ one }) => ({
  employee: one(employees, {
    fields: [timeOffRequests.employeeId],
    references: [employees.id],
  }),
}));

export const salaryStructuresRelations = relations(
  salaryStructures,
  ({ many }) => ({
    rules: many(salaryRules),
    contracts: many(contracts),
    payruns: many(payruns),
  }),
);

export const salaryRulesRelations = relations(salaryRules, ({ one }) => ({
  structure: one(salaryStructures, {
    fields: [salaryRules.structureId],
    references: [salaryStructures.id],
  }),
}));

export const payrunsRelations = relations(payruns, ({ one, many }) => ({
  salaryStructure: one(salaryStructures, {
    fields: [payruns.salaryStructureId],
    references: [salaryStructures.id],
  }),
  employees: many(payrunEmployees),
  payslips: many(payslips),
  warnings: many(payrollWarnings),
}));

export const payrunEmployeesRelations = relations(
  payrunEmployees,
  ({ one }) => ({
    payrun: one(payruns, {
      fields: [payrunEmployees.payrunId],
      references: [payruns.id],
    }),
    employee: one(employees, {
      fields: [payrunEmployees.employeeId],
      references: [employees.id],
    }),
  }),
);

export const payslipsRelations = relations(payslips, ({ one, many }) => ({
  payrun: one(payruns, {
    fields: [payslips.payrunId],
    references: [payruns.id],
  }),
  employee: one(employees, {
    fields: [payslips.employeeId],
    references: [employees.id],
  }),
  contract: one(contracts, {
    fields: [payslips.contractId],
    references: [contracts.id],
  }),
  lines: many(payslipLines),
}));

export const payslipLinesRelations = relations(payslipLines, ({ one }) => ({
  payslip: one(payslips, {
    fields: [payslipLines.payslipId],
    references: [payslips.id],
  }),
}));

export const payrollWarningsRelations = relations(
  payrollWarnings,
  ({ one }) => ({
    payrun: one(payruns, {
      fields: [payrollWarnings.payrunId],
      references: [payruns.id],
    }),
    employee: one(employees, {
      fields: [payrollWarnings.employeeId],
      references: [employees.id],
    }),
  }),
);

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type Contract = typeof contracts.$inferSelect;
export type Payrun = typeof payruns.$inferSelect;
export type Payslip = typeof payslips.$inferSelect;
