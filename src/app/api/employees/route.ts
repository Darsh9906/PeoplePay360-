import { and, asc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db } from "@/db";
import { departments, employees, employeeWorkingSchedules, workingSchedules } from "@/db/schema";
import { writeAuditLog } from "../_lib/audit";
import { isResponse, resolveAccess } from "../_lib/access";
import {
  badRequest,
  created,
  forbidden,
  ok,
  serverError,
} from "../_lib/responses";

const managers = alias(employees, "managers");

const createEmployeeSchema = z.object({
  employeeCode: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  workEmail: z.string().email(),
  departmentId: z.string().uuid(),
  jobTitle: z.string().min(1),
  managerId: z.string().uuid().nullable().optional(),
  status: z.enum(["active", "inactive", "terminated"]).default("active"),
  hireDate: z.string().min(1),
});

export async function GET() {
  try {
    const access = await resolveAccess();

    if (isResponse(access)) {
      return access;
    }

    const rows = await db
      .select({
        id: employees.id,
        employeeCode: employees.employeeCode,
        firstName: employees.firstName,
        lastName: employees.lastName,
        workEmail: employees.workEmail,
        jobTitle: employees.jobTitle,
        status: employees.status,
        hireDate: employees.hireDate,
        department: departments.name,
        managerName: sql<string | null>`nullif(trim(concat(${managers.firstName}, ' ', ${managers.lastName})), '')`,
        scheduleName: sql<string | null>`(
          select ${workingSchedules.name}
          from ${employeeWorkingSchedules}
          inner join ${workingSchedules} on ${workingSchedules.id} = ${employeeWorkingSchedules.scheduleId}
          where ${employeeWorkingSchedules.employeeId} = ${employees.id}
          order by ${employeeWorkingSchedules.effectiveFrom} desc
          limit 1
        )`,
      })
      .from(employees)
      .innerJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(managers, eq(employees.managerId, managers.id))
      .where(
        and(
          eq(employees.organizationId, access.organizationId),
          access.scopeEmployeeId
            ? eq(employees.id, access.scopeEmployeeId)
            : undefined,
        ),
      )
      .orderBy(asc(employees.employeeCode));

    return ok(
      rows.map((employee) => ({
        ...employee,
        fullName: `${employee.firstName} ${employee.lastName}`,
      })),
    );
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const access = await resolveAccess();

    if (isResponse(access)) {
      return access;
    }

    // Creating employees is an HR action, not self-service.
    if (access.user.role === "employee") {
      return forbidden("Your role does not allow this action");
    }

    const parsed = createEmployeeSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [employee] = await db
      .insert(employees)
      .values({
        organizationId: access.organizationId,
        ...parsed.data,
        workEmail: parsed.data.workEmail.toLowerCase(),
      })
      .returning();

    await writeAuditLog({
      action: "create",
      entityType: "employee",
      entityId: employee.id,
      summary: `Created employee ${employee.employeeCode}`,
    });

    return created(employee);
  } catch (error) {
    return serverError(error);
  }
}
