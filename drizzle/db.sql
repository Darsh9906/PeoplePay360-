CREATE TYPE "public"."attendance_status" AS ENUM('present', 'late', 'absent', 'half_day');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('active', 'expired', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('active', 'inactive', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."payrun_status" AS ENUM('draft', 'computed', 'validated', 'paid');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('submitted', 'approved', 'refused');--> statement-breakpoint
CREATE TYPE "public"."salary_rule_category" AS ENUM('earning', 'deduction', 'net');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('employee', 'hr_manager', 'payroll_user', 'payroll_manager', 'admin');--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"attendance_date" date NOT NULL,
	"check_in" timestamp with time zone,
	"check_out" timestamp with time zone,
	"worked_hours" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"status" "attendance_status" DEFAULT 'present' NOT NULL
);

CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"status" "contract_status" DEFAULT 'active' NOT NULL,
	"monthly_wage" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"salary_structure_id" uuid
);

CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"code" varchar(30) NOT NULL
);

CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_code" varchar(30) NOT NULL,
	"user_id" uuid,
	"first_name" varchar(80) NOT NULL,
	"last_name" varchar(80) NOT NULL,
	"work_email" varchar(255) NOT NULL,
	"department_id" uuid NOT NULL,
	"job_title" varchar(120) NOT NULL,
	"manager_id" uuid,
	"status" "employee_status" DEFAULT 'active' NOT NULL,
	"hire_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "payroll_warnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payrun_id" uuid,
	"employee_id" uuid,
	"code" varchar(80) NOT NULL,
	"message" text NOT NULL
);

CREATE TABLE "payrun_employees" (
	"payrun_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	CONSTRAINT "payrun_employees_payrun_id_employee_id_pk" PRIMARY KEY("payrun_id","employee_id")
);

CREATE TABLE "payruns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(140) NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"salary_structure_id" uuid,
	"status" "payrun_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "payslip_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payslip_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"code" varchar(30) NOT NULL,
	"category" "salary_rule_category" NOT NULL,
	"sequence" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL
);
--> statement-breakpoint

	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payrun_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"contract_id" uuid,
	"worked_days" numeric(6, 2) DEFAULT '0.00' NOT NULL,
	"leave_days" numeric(6, 2) DEFAULT '0.00' NOT NULL,
	"gross_pay" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total_deductions" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"net_pay" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"status" "payrun_status" DEFAULT 'draft' NOT NULL
);

CREATE TABLE "salary_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"structure_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"code" varchar(30) NOT NULL,
	"category" "salary_rule_category" NOT NULL,
	"sequence" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"percentage_base_code" varchar(30)
);

CREATE TABLE "salary_structures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"code" varchar(30) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);

CREATE TABLE "time_off_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"type_name" varchar(80) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"duration_days" numeric(6, 2) NOT NULL,
	"status" "request_status" DEFAULT 'submitted' NOT NULL,
	"reason" text
);

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(140) NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'employee' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_salary_structure_id_salary_structures_id_fk" FOREIGN KEY ("salary_structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_warnings" ADD CONSTRAINT "payroll_warnings_payrun_id_payruns_id_fk" FOREIGN KEY ("payrun_id") REFERENCES "public"."payruns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_warnings" ADD CONSTRAINT "payroll_warnings_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrun_employees" ADD CONSTRAINT "payrun_employees_payrun_id_payruns_id_fk" FOREIGN KEY ("payrun_id") REFERENCES "public"."payruns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrun_employees" ADD CONSTRAINT "payrun_employees_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payruns" ADD CONSTRAINT "payruns_salary_structure_id_salary_structures_id_fk" FOREIGN KEY ("salary_structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslip_lines" ADD CONSTRAINT "payslip_lines_payslip_id_payslips_id_fk" FOREIGN KEY ("payslip_id") REFERENCES "public"."payslips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payrun_id_payruns_id_fk" FOREIGN KEY ("payrun_id") REFERENCES "public"."payruns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_rules" ADD CONSTRAINT "salary_rules_structure_id_salary_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_employee_date_idx" ON "attendance_records" USING btree ("employee_id","attendance_date");
CREATE INDEX "contracts_employee_idx" ON "contracts" USING btree ("employee_id");
CREATE UNIQUE INDEX "employees_code_idx" ON "employees" USING btree ("employee_code");
CREATE UNIQUE INDEX "employees_work_email_idx" ON "employees" USING btree ("work_email");
CREATE INDEX "employees_department_idx" ON "employees" USING btree ("department_id");
CREATE INDEX "payslip_lines_payslip_idx" ON "payslip_lines" USING btree ("payslip_id");
CREATE UNIQUE INDEX "payslips_payrun_employee_idx" ON "payslips" USING btree ("payrun_id","employee_id");
CREATE INDEX "salary_rules_structure_idx" ON "salary_rules" USING btree ("structure_id");
CREATE INDEX "time_off_employee_idx" ON "time_off_requests" USING btree ("employee_id");
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");