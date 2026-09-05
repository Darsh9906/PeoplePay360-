CREATE TYPE "public"."allocation_status" AS ENUM('draft', 'approved', 'refused');--> statement-breakpoint
CREATE TYPE "public"."time_off_unit" AS ENUM('days', 'hours');--> statement-breakpoint
ALTER TYPE "public"."salary_rule_category" ADD VALUE 'basic' BEFORE 'earning';--> statement-breakpoint
ALTER TYPE "public"."salary_rule_category" ADD VALUE 'allowance' BEFORE 'earning';--> statement-breakpoint
ALTER TYPE "public"."salary_rule_category" ADD VALUE 'gross' BEFORE 'deduction';--> statement-breakpoint
CREATE TABLE "leave_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"time_off_type_id" uuid NOT NULL,
	"allocated_days" numeric(6, 2) DEFAULT '0.00' NOT NULL,
	"consumed_days" numeric(6, 2) DEFAULT '0.00' NOT NULL,
	"status" "allocation_status" DEFAULT 'draft' NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"notes" text,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_off_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"code" varchar(30) NOT NULL,
	"unit" time_off_unit DEFAULT 'days' NOT NULL,
	"requires_allocation" boolean DEFAULT true NOT NULL,
	"requires_approval" boolean DEFAULT true NOT NULL,
	"is_paid" boolean DEFAULT true NOT NULL,
	"affects_payroll" boolean DEFAULT true NOT NULL,
	"color_hex" varchar(9) DEFAULT '#2563eb' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "working_schedule_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"break_minutes" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD COLUMN "time_off_type_id" uuid;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD COLUMN "allocation_id" uuid;--> statement-breakpoint
ALTER TABLE "working_schedules" ADD COLUMN "weekly_hours" numeric(6, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_allocations" ADD CONSTRAINT "leave_allocations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_allocations" ADD CONSTRAINT "leave_allocations_time_off_type_id_time_off_types_id_fk" FOREIGN KEY ("time_off_type_id") REFERENCES "public"."time_off_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_allocations" ADD CONSTRAINT "leave_allocations_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_schedule_lines" ADD CONSTRAINT "working_schedule_lines_schedule_id_working_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."working_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leave_allocations_employee_idx" ON "leave_allocations" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "leave_allocations_type_idx" ON "leave_allocations" USING btree ("time_off_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "time_off_types_code_idx" ON "time_off_types" USING btree ("code");--> statement-breakpoint
CREATE INDEX "working_schedule_lines_schedule_idx" ON "working_schedule_lines" USING btree ("schedule_id");--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_time_off_type_id_time_off_types_id_fk" FOREIGN KEY ("time_off_type_id") REFERENCES "public"."time_off_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_allocation_id_leave_allocations_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."leave_allocations"("id") ON DELETE no action ON UPDATE no action;