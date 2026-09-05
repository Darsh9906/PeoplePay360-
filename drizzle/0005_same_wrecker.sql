DROP INDEX "employees_code_idx";--> statement-breakpoint
DROP INDEX "employees_work_email_idx";--> statement-breakpoint
DROP INDEX "statutory_settings_code_idx";--> statement-breakpoint
DROP INDEX "time_off_types_code_idx";--> statement-breakpoint
DROP INDEX "working_schedules_name_idx";--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "payruns" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "salary_structures" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "statutory_settings" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "time_off_types" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "working_schedules" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payruns" ADD CONSTRAINT "payruns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statutory_settings" ADD CONSTRAINT "statutory_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_types" ADD CONSTRAINT "time_off_types_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_schedules" ADD CONSTRAINT "working_schedules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "employees_code_idx" ON "employees" USING btree ("organization_id","employee_code");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_work_email_idx" ON "employees" USING btree ("organization_id","work_email");--> statement-breakpoint
CREATE UNIQUE INDEX "statutory_settings_code_idx" ON "statutory_settings" USING btree ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "time_off_types_code_idx" ON "time_off_types" USING btree ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "working_schedules_name_idx" ON "working_schedules" USING btree ("organization_id","name");--> statement-breakpoint
UPDATE "departments"        SET "organization_id" = (SELECT id FROM organizations ORDER BY created_at LIMIT 1) WHERE "organization_id" IS NULL;--> statement-breakpoint
UPDATE "employees"          SET "organization_id" = (SELECT id FROM organizations ORDER BY created_at LIMIT 1) WHERE "organization_id" IS NULL;--> statement-breakpoint
UPDATE "working_schedules"  SET "organization_id" = (SELECT id FROM organizations ORDER BY created_at LIMIT 1) WHERE "organization_id" IS NULL;--> statement-breakpoint
UPDATE "salary_structures"  SET "organization_id" = (SELECT id FROM organizations ORDER BY created_at LIMIT 1) WHERE "organization_id" IS NULL;--> statement-breakpoint
UPDATE "time_off_types"     SET "organization_id" = (SELECT id FROM organizations ORDER BY created_at LIMIT 1) WHERE "organization_id" IS NULL;--> statement-breakpoint
UPDATE "payruns"            SET "organization_id" = (SELECT id FROM organizations ORDER BY created_at LIMIT 1) WHERE "organization_id" IS NULL;--> statement-breakpoint
UPDATE "statutory_settings" SET "organization_id" = (SELECT id FROM organizations ORDER BY created_at LIMIT 1) WHERE "organization_id" IS NULL;--> statement-breakpoint
UPDATE "users"              SET "organization_id" = (SELECT id FROM organizations ORDER BY created_at LIMIT 1) WHERE "organization_id" IS NULL;
