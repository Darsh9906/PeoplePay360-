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

export const userStatusEnum = pgEnum("user_status", [
  "invited",
  "active",
  "inactive",
  "suspended",
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
  "basic",
  "allowance",
  "earning",
  "gross",
  "deduction",
  "net",
]);

export const scheduleStatusEnum = pgEnum("schedule_status", [
  "active",
  "inactive",
]);

export const timeOffUnitEnum = pgEnum("time_off_unit", ["days", "hours"]);

export const allocationStatusEnum = pgEnum("allocation_status", [
  "draft",
  "approved",
  "refused",
]);

export const approvalEntityEnum = pgEnum("approval_entity", [
  "time_off",
  "payrun",
  "contract",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "approve",
  "reject",
  "compute",
  "pay",
]);

export const documentEntityEnum = pgEnum("document_entity", [
  "employee",
  "contract",
  "payslip",
  "payrun",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "identity",
  "contract",
  "payslip",
  "tax",
  "other",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "in_app",
  "email",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "sent",
  "read",
  "failed",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "draft",
  "approved",
  "processing",
  "paid",
  "failed",
]);

export const statutoryComponentEnum = pgEnum("statutory_component", [
  "pf",
  "esi",
  "professional_tax",
  "income_tax",
]);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    /** Work-email domain of the signing-up company, e.g. "acme.com". */
    emailDomain: varchar("email_domain", { length: 120 }),
    industry: varchar("industry", { length: 120 }),
    companySize: varchar("company_size", { length: 40 }),
    countryCode: varchar("country_code", { length: 2 }).notNull().default("IN"),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("organizations_slug_idx").on(table.slug),
  }),
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    name: varchar("name", { length: 140 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    role: userRoleEnum("role").notNull().default("employee"),
    status: userStatusEnum("status").notNull().default("active"),
    passwordHash: text("password_hash"),
    /** Set when an admin issues a temporary password; cleared on first change. */
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    passwordChangedAt: timestamp("password_changed_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("sessions_token_hash_idx").on(table.tokenHash),
    userIdx: index("sessions_user_idx").on(table.userId),
  }),
);

export const inviteTokens = pgTable(
  "invite_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("invite_tokens_token_hash_idx").on(table.tokenHash),
    userIdx: index("invite_tokens_user_idx").on(table.userId),
  }),
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("password_reset_tokens_token_hash_idx").on(
      table.tokenHash,
    ),
    userIdx: index("password_reset_tokens_user_idx").on(table.userId),
  }),
);

export const departments = pgTable("departments", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  name: varchar("name", { length: 120 }).notNull(),
  code: varchar("code", { length: 30 }).notNull(),
});

export const workingSchedules = pgTable(
  "working_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    name: varchar("name", { length: 140 }).notNull(),
    workingDays: text("working_days").notNull(),
    startTime: varchar("start_time", { length: 5 }).notNull(),
    endTime: varchar("end_time", { length: 5 }).notNull(),
    breakDurationMinutes: integer("break_duration_minutes")
      .notNull()
      .default(0),
    timezone: varchar("timezone", { length: 80 })
      .notNull()
      .default("Asia/Kolkata"),
    weeklyHours: numeric("weekly_hours", { precision: 6, scale: 2 })
      .notNull()
      .default("0.00"),
    status: scheduleStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    nameIdx: uniqueIndex("working_schedules_name_idx").on(
      table.organizationId,
      table.name,
    ),
  }),
);

export const workingScheduleLines = pgTable(
  "working_schedule_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scheduleId: uuid("schedule_id")
      .notNull()
      .references(() => workingSchedules.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: varchar("start_time", { length: 5 }).notNull(),
    endTime: varchar("end_time", { length: 5 }).notNull(),
    breakMinutes: integer("break_minutes").notNull().default(0),
  },
  (table) => ({
    scheduleIdx: index("working_schedule_lines_schedule_idx").on(
      table.scheduleId,
    ),
  }),
);

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
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
    codeIdx: uniqueIndex("employees_code_idx").on(
      table.organizationId,
      table.employeeCode,
    ),
    emailIdx: uniqueIndex("employees_work_email_idx").on(
      table.organizationId,
      table.workEmail,
    ),
    departmentIdx: index("employees_department_idx").on(table.departmentId),
  }),
);

export const employeeWorkingSchedules = pgTable(
  "employee_working_schedules",
  {
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    scheduleId: uuid("schedule_id")
      .notNull()
      .references(() => workingSchedules.id, { onDelete: "cascade" }),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.employeeId, table.scheduleId] }),
    scheduleIdx: index("employee_working_schedules_schedule_idx").on(
      table.scheduleId,
    ),
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
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    notes: text("notes"),
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

export const timeOffTypes = pgTable(
  "time_off_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    name: varchar("name", { length: 120 }).notNull(),
    code: varchar("code", { length: 30 }).notNull(),
    unit: timeOffUnitEnum("unit").notNull().default("days"),
    requiresAllocation: boolean("requires_allocation").notNull().default(true),
    requiresApproval: boolean("requires_approval").notNull().default(true),
    isPaid: boolean("is_paid").notNull().default(true),
    affectsPayroll: boolean("affects_payroll").notNull().default(true),
    colorHex: varchar("color_hex", { length: 9 }).notNull().default("#2563eb"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    codeIdx: uniqueIndex("time_off_types_code_idx").on(
      table.organizationId,
      table.code,
    ),
  }),
);

export const leaveAllocations = pgTable(
  "leave_allocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    timeOffTypeId: uuid("time_off_type_id")
      .notNull()
      .references(() => timeOffTypes.id, { onDelete: "cascade" }),
    allocatedDays: numeric("allocated_days", { precision: 6, scale: 2 })
      .notNull()
      .default("0.00"),
    consumedDays: numeric("consumed_days", { precision: 6, scale: 2 })
      .notNull()
      .default("0.00"),
    status: allocationStatusEnum("status").notNull().default("draft"),
    validFrom: date("valid_from").notNull(),
    validTo: date("valid_to"),
    notes: text("notes"),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    employeeIdx: index("leave_allocations_employee_idx").on(table.employeeId),
    typeIdx: index("leave_allocations_type_idx").on(table.timeOffTypeId),
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
    timeOffTypeId: uuid("time_off_type_id").references(() => timeOffTypes.id),
    allocationId: uuid("allocation_id").references(() => leaveAllocations.id),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    durationDays: numeric("duration_days", { precision: 6, scale: 2 }).notNull(),
    status: requestStatusEnum("status").notNull().default("submitted"),
    reason: text("reason"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rejectedReason: text("rejected_reason"),
  },
  (table) => ({
    employeeIdx: index("time_off_employee_idx").on(table.employeeId),
  }),
);

export const salaryStructures = pgTable("salary_structures", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
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
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  name: varchar("name", { length: 140 }).notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  salaryStructureId: uuid("salary_structure_id").references(
    () => salaryStructures.id,
  ),
  status: payrunStatusEnum("status").notNull().default("draft"),
  createdBy: uuid("created_by").references(() => users.id),
  validatedBy: uuid("validated_by").references(() => users.id),
  validatedAt: timestamp("validated_at", { withTimezone: true }),
  paidBy: uuid("paid_by").references(() => users.id),
  paidAt: timestamp("paid_at", { withTimezone: true }),
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

export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: approvalEntityEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    status: approvalStatusEnum("status").notNull().default("pending"),
    requestedBy: uuid("requested_by").references(() => users.id),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    entityIdx: index("approvals_entity_idx").on(
      table.entityType,
      table.entityId,
    ),
    statusIdx: index("approvals_status_idx").on(table.status),
  }),
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    action: auditActionEnum("action").notNull(),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    entityId: uuid("entity_id"),
    summary: text("summary").notNull(),
    metadata: text("metadata"),
    ipAddress: varchar("ip_address", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    entityIdx: index("audit_logs_entity_idx").on(
      table.entityType,
      table.entityId,
    ),
    actorIdx: index("audit_logs_actor_idx").on(table.actorUserId),
  }),
);

export const employeeBankAccounts = pgTable(
  "employee_bank_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    accountHolderName: varchar("account_holder_name", { length: 140 }).notNull(),
    bankName: varchar("bank_name", { length: 140 }).notNull(),
    accountNumberMasked: varchar("account_number_masked", {
      length: 40,
    }).notNull(),
    ifscCode: varchar("ifsc_code", { length: 20 }).notNull(),
    isPrimary: boolean("is_primary").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    employeeIdx: index("employee_bank_accounts_employee_idx").on(
      table.employeeId,
    ),
  }),
);

export const paymentBatches = pgTable(
  "payment_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    payrunId: uuid("payrun_id")
      .notNull()
      .references(() => payruns.id, { onDelete: "cascade" }),
    status: paymentStatusEnum("status").notNull().default("draft"),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0.00"),
    createdBy: uuid("created_by").references(() => users.id),
    approvedBy: uuid("approved_by").references(() => users.id),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    payrunIdx: uniqueIndex("payment_batches_payrun_idx").on(table.payrunId),
  }),
);

export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => paymentBatches.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id),
    payslipId: uuid("payslip_id").references(() => payslips.id),
    bankAccountId: uuid("bank_account_id").references(
      () => employeeBankAccounts.id,
    ),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status: paymentStatusEnum("status").notNull().default("draft"),
    referenceNumber: varchar("reference_number", { length: 120 }),
    failureReason: text("failure_reason"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    batchIdx: index("payment_transactions_batch_idx").on(table.batchId),
    employeeIdx: index("payment_transactions_employee_idx").on(
      table.employeeId,
    ),
  }),
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: documentEntityEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    documentType: documentTypeEnum("document_type").notNull().default("other"),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileUrl: text("file_url").notNull(),
    mimeType: varchar("mime_type", { length: 120 }),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    entityIdx: index("documents_entity_idx").on(
      table.entityType,
      table.entityId,
    ),
  }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channel: notificationChannelEnum("channel").notNull().default("in_app"),
    title: varchar("title", { length: 160 }).notNull(),
    message: text("message").notNull(),
    status: notificationStatusEnum("status").notNull().default("pending"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("notifications_user_idx").on(table.userId),
    statusIdx: index("notifications_status_idx").on(table.status),
  }),
);

export const emailLogs = pgTable(
  "email_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id),
    email: varchar("email", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    status: notificationStatusEnum("status").notNull().default("pending"),
    provider: varchar("provider", { length: 80 }),
    providerMessageId: varchar("provider_message_id", { length: 180 }),
    errorMessage: text("error_message"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailIdx: index("email_logs_email_idx").on(table.email),
    userIdx: index("email_logs_user_idx").on(table.userId),
  }),
);

export const statutorySettings = pgTable(
  "statutory_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    component: statutoryComponentEnum("component").notNull(),
    code: varchar("code", { length: 40 }).notNull(),
    name: varchar("name", { length: 140 }).notNull(),
    rate: numeric("rate", { precision: 6, scale: 2 }),
    fixedAmount: numeric("fixed_amount", { precision: 12, scale: 2 }),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => ({
    codeIdx: uniqueIndex("statutory_settings_code_idx").on(
      table.organizationId,
      table.code,
    ),
    componentIdx: index("statutory_settings_component_idx").on(table.component),
  }),
);

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  employee: one(employees, {
    fields: [users.id],
    references: [employees.userId],
  }),
  sessions: many(sessions),
  inviteTokens: many(inviteTokens, { relationName: "invited_user" }),
  createdInviteTokens: many(inviteTokens, { relationName: "invite_creator" }),
  passwordResetTokens: many(passwordResetTokens),
  notifications: many(notifications),
  emailLogs: many(emailLogs),
  auditLogs: many(auditLogs, { relationName: "audit_actor" }),
  requestedApprovals: many(approvals, { relationName: "approval_requester" }),
  reviewedApprovals: many(approvals, { relationName: "approval_reviewer" }),
  approvedContracts: many(contracts, { relationName: "contract_approver" }),
  reviewedTimeOffRequests: many(timeOffRequests, {
    relationName: "time_off_reviewer",
  }),
  createdPayruns: many(payruns, { relationName: "payrun_creator" }),
  validatedPayruns: many(payruns, { relationName: "payrun_validator" }),
  paidPayruns: many(payruns, { relationName: "payrun_payer" }),
  uploadedDocuments: many(documents, { relationName: "document_uploader" }),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  employees: many(employees),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const inviteTokensRelations = relations(inviteTokens, ({ one }) => ({
  user: one(users, {
    fields: [inviteTokens.userId],
    references: [users.id],
    relationName: "invited_user",
  }),
  creator: one(users, {
    fields: [inviteTokens.createdBy],
    references: [users.id],
    relationName: "invite_creator",
  }),
}));

export const passwordResetTokensRelations = relations(
  passwordResetTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordResetTokens.userId],
      references: [users.id],
    }),
  }),
);

export const workingSchedulesRelations = relations(
  workingSchedules,
  ({ many }) => ({
    employees: many(employeeWorkingSchedules),
    lines: many(workingScheduleLines),
  }),
);

export const workingScheduleLinesRelations = relations(
  workingScheduleLines,
  ({ one }) => ({
    schedule: one(workingSchedules, {
      fields: [workingScheduleLines.scheduleId],
      references: [workingSchedules.id],
    }),
  }),
);

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
  leaveAllocations: many(leaveAllocations),
  payslips: many(payslips),
  workingSchedules: many(employeeWorkingSchedules),
  bankAccounts: many(employeeBankAccounts),
  paymentTransactions: many(paymentTransactions),
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
  approver: one(users, {
    fields: [contracts.approvedBy],
    references: [users.id],
    relationName: "contract_approver",
  }),
}));

export const employeeWorkingSchedulesRelations = relations(
  employeeWorkingSchedules,
  ({ one }) => ({
    employee: one(employees, {
      fields: [employeeWorkingSchedules.employeeId],
      references: [employees.id],
    }),
    schedule: one(workingSchedules, {
      fields: [employeeWorkingSchedules.scheduleId],
      references: [workingSchedules.id],
    }),
  }),
);

export const attendanceRelations = relations(attendanceRecords, ({ one }) => ({
  employee: one(employees, {
    fields: [attendanceRecords.employeeId],
    references: [employees.id],
  }),
}));

export const timeOffTypesRelations = relations(timeOffTypes, ({ many }) => ({
  requests: many(timeOffRequests),
  allocations: many(leaveAllocations),
}));

export const leaveAllocationsRelations = relations(
  leaveAllocations,
  ({ one, many }) => ({
    employee: one(employees, {
      fields: [leaveAllocations.employeeId],
      references: [employees.id],
    }),
    timeOffType: one(timeOffTypes, {
      fields: [leaveAllocations.timeOffTypeId],
      references: [timeOffTypes.id],
    }),
    approver: one(users, {
      fields: [leaveAllocations.approvedBy],
      references: [users.id],
      relationName: "allocation_approver",
    }),
    requests: many(timeOffRequests),
  }),
);

export const timeOffRelations = relations(timeOffRequests, ({ one }) => ({
  employee: one(employees, {
    fields: [timeOffRequests.employeeId],
    references: [employees.id],
  }),
  timeOffType: one(timeOffTypes, {
    fields: [timeOffRequests.timeOffTypeId],
    references: [timeOffTypes.id],
  }),
  allocation: one(leaveAllocations, {
    fields: [timeOffRequests.allocationId],
    references: [leaveAllocations.id],
  }),
  reviewer: one(users, {
    fields: [timeOffRequests.reviewedBy],
    references: [users.id],
    relationName: "time_off_reviewer",
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
  creator: one(users, {
    fields: [payruns.createdBy],
    references: [users.id],
    relationName: "payrun_creator",
  }),
  validator: one(users, {
    fields: [payruns.validatedBy],
    references: [users.id],
    relationName: "payrun_validator",
  }),
  payer: one(users, {
    fields: [payruns.paidBy],
    references: [users.id],
    relationName: "payrun_payer",
  }),
  employees: many(payrunEmployees),
  payslips: many(payslips),
  warnings: many(payrollWarnings),
  paymentBatch: many(paymentBatches),
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

export const approvalsRelations = relations(approvals, ({ one }) => ({
  requester: one(users, {
    fields: [approvals.requestedBy],
    references: [users.id],
    relationName: "approval_requester",
  }),
  reviewer: one(users, {
    fields: [approvals.reviewedBy],
    references: [users.id],
    relationName: "approval_reviewer",
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
    relationName: "audit_actor",
  }),
}));

export const employeeBankAccountsRelations = relations(
  employeeBankAccounts,
  ({ one, many }) => ({
    employee: one(employees, {
      fields: [employeeBankAccounts.employeeId],
      references: [employees.id],
    }),
    paymentTransactions: many(paymentTransactions),
  }),
);

export const paymentBatchesRelations = relations(
  paymentBatches,
  ({ one, many }) => ({
    payrun: one(payruns, {
      fields: [paymentBatches.payrunId],
      references: [payruns.id],
    }),
    creator: one(users, {
      fields: [paymentBatches.createdBy],
      references: [users.id],
      relationName: "payment_batch_creator",
    }),
    approver: one(users, {
      fields: [paymentBatches.approvedBy],
      references: [users.id],
      relationName: "payment_batch_approver",
    }),
    transactions: many(paymentTransactions),
  }),
);

export const paymentTransactionsRelations = relations(
  paymentTransactions,
  ({ one }) => ({
    batch: one(paymentBatches, {
      fields: [paymentTransactions.batchId],
      references: [paymentBatches.id],
    }),
    employee: one(employees, {
      fields: [paymentTransactions.employeeId],
      references: [employees.id],
    }),
    payslip: one(payslips, {
      fields: [paymentTransactions.payslipId],
      references: [payslips.id],
    }),
    bankAccount: one(employeeBankAccounts, {
      fields: [paymentTransactions.bankAccountId],
      references: [employeeBankAccounts.id],
    }),
  }),
);

export const documentsRelations = relations(documents, ({ one }) => ({
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
    relationName: "document_uploader",
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  user: one(users, {
    fields: [emailLogs.userId],
    references: [users.id],
  }),
}));

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type Contract = typeof contracts.$inferSelect;
export type Payrun = typeof payruns.$inferSelect;
export type Payslip = typeof payslips.$inferSelect;
export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type WorkingSchedule = typeof workingSchedules.$inferSelect;
export type WorkingScheduleLine = typeof workingScheduleLines.$inferSelect;
export type TimeOffType = typeof timeOffTypes.$inferSelect;
export type LeaveAllocation = typeof leaveAllocations.$inferSelect;
export type TimeOffRequest = typeof timeOffRequests.$inferSelect;
export type PaymentBatch = typeof paymentBatches.$inferSelect;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type Document = typeof documents.$inferSelect;
