import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  attendanceRecords,
  contracts,
  departments,
  employeeWorkingSchedules,
  employees,
  leaveAllocations,
  payslips,
  timeOffRequests,
  timeOffTypes,
  workingSchedules,
} from "@/db/schema";
import { isResponse, resolveAccess } from "../../_lib/access";
import { writeAuditLog } from "../../_lib/audit";
import {
  badRequest,
  forbidden,
  noContent,
  notFound,
  ok,
  serverError,
} from "../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function employeeIdentityFilter(value: string) {
  return uuidPattern.test(value)
    ? eq(employees.id, value)
    : eq(employees.employeeCode, value);
}

const updateEmployeeSchema = z.object({
  employeeCode: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  workEmail: z.string().email().optional(),
  departmentId: z.string().uuid().optional(),
  jobTitle: z.string().min(1).optional(),
  managerId: z.string().uuid().nullable().optional(),
  status: z.enum(["active", "inactive", "terminated"]).optional(),
  hireDate: z.string().min(1).optional(),
});

export async function GET(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;

    const access = await resolveAccess();

    if (isResponse(access)) {
      return access;
    }

    const employee = await db
      .select({
        id: employees.id,
        employeeCode: employees.employeeCode,
        firstName: employees.firstName,
        lastName: employees.lastName,
        workEmail: employees.workEmail,
        jobTitle: employees.jobTitle,
        status: employees.status,
        hireDate: employees.hireDate,
        departmentId: employees.departmentId,
        department: departments.name,
        managerId: employees.managerId,
        managerName: sql<string | null>`(
          select concat(m.first_name, ' ', m.last_name)
          from ${employees} m where m.id = ${employees.managerId}
        )`,
      })
      .from(employees)
      .innerJoin(departments, eq(employees.departmentId, departments.id))
      .where(
        and(
          eq(employees.organizationId, access.organizationId),
          employeeIdentityFilter(id),
          access.scopeEmployeeId
            ? eq(employees.id, access.scopeEmployeeId)
            : undefined,
        ),
      )
      .limit(1);

    if (!employee[0]) {
      return access.scopeEmployeeId
        ? forbidden("You can only view your own employee record")
        : notFound("Employee not found");
    }

    const employeeId = employee[0].id;

    const [
      employeeContracts,
      attendance,
      timeOff,
      employeePayslips,
      allocations,
      schedules,
    ] = await Promise.all([
        db
          .select()
          .from(contracts)
          .where(eq(contracts.employeeId, employeeId))
          .orderBy(desc(contracts.startDate)),
        db
          .select()
          .from(attendanceRecords)
          .where(eq(attendanceRecords.employeeId, employeeId))
          .orderBy(desc(attendanceRecords.attendanceDate))
          .limit(10),
        db
          .select()
          .from(timeOffRequests)
          .where(eq(timeOffRequests.employeeId, employeeId))
          .orderBy(desc(timeOffRequests.startDate))
          .limit(10),
        db
          .select()
          .from(payslips)
          .where(eq(payslips.employeeId, employeeId))
          .orderBy(desc(payslips.id))
          .limit(10),
        db
          .select({
            id: leaveAllocations.id,
            timeOffTypeId: leaveAllocations.timeOffTypeId,
            typeName: timeOffTypes.name,
            colorHex: timeOffTypes.colorHex,
            allocatedDays: leaveAllocations.allocatedDays,
            consumedDays: leaveAllocations.consumedDays,
            remainingDays: sql<string>`(${leaveAllocations.allocatedDays} - ${leaveAllocations.consumedDays})::text`,
            status: leaveAllocations.status,
            validFrom: leaveAllocations.validFrom,
            validTo: leaveAllocations.validTo,
          })
          .from(leaveAllocations)
          .innerJoin(
            timeOffTypes,
            eq(leaveAllocations.timeOffTypeId, timeOffTypes.id),
          )
          .where(eq(leaveAllocations.employeeId, employeeId))
          .orderBy(asc(timeOffTypes.name)),
        db
          .select({
            id: workingSchedules.id,
            name: workingSchedules.name,
            weeklyHours: workingSchedules.weeklyHours,
            effectiveFrom: employeeWorkingSchedules.effectiveFrom,
            effectiveTo: employeeWorkingSchedules.effectiveTo,
          })
          .from(employeeWorkingSchedules)
          .innerJoin(
            workingSchedules,
            eq(employeeWorkingSchedules.scheduleId, workingSchedules.id),
          )
          .where(eq(employeeWorkingSchedules.employeeId, employeeId))
          .orderBy(desc(employeeWorkingSchedules.effectiveFrom)),
      ]);

    return ok({
      ...employee[0],
      fullName: `${employee[0].firstName} ${employee[0].lastName}`,
      contracts: employeeContracts,
      attendance,
      timeOff,
      payslips: employeePayslips,
      allocations,
      schedules,
      workingSchedule: schedules[0] ?? null,
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const access = await resolveAccess();

    if (isResponse(access)) {
      return access;
    }

    if (access.user.role === "employee") {
      return forbidden("Your role does not allow this action");
    }

    const parsed = updateEmployeeSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    if (parsed.data.departmentId) {
      const department = await db.query.departments.findFirst({
        where: and(
          eq(departments.id, parsed.data.departmentId),
          eq(departments.organizationId, access.organizationId),
        ),
      });

      if (!department) {
        return badRequest("Selected department is not available");
      }
    }

    if (parsed.data.managerId) {
      const manager = await db.query.employees.findFirst({
        where: and(
          eq(employees.id, parsed.data.managerId),
          eq(employees.organizationId, access.organizationId),
        ),
      });

      if (!manager) {
        return badRequest("Selected manager is not available");
      }
    }

    const updateData = {
      ...parsed.data,
      workEmail: parsed.data.workEmail?.toLowerCase(),
    };

    const existingEmployee = await db.query.employees.findFirst({
      where: and(
        eq(employees.organizationId, access.organizationId),
        employeeIdentityFilter(id),
      ),
    });

    if (!existingEmployee) {
      return notFound("Employee not found");
    }

    const [employee] = await db
      .update(employees)
      .set(updateData)
      .where(
        and(
          eq(employees.id, existingEmployee.id),
          eq(employees.organizationId, access.organizationId),
        ),
      )
      .returning();

    if (!employee) {
      return notFound("Employee not found");
    }

    await writeAuditLog({
      actorUserId: access.user.id,
      action: "update",
      entityType: "employee",
      entityId: employee.id,
      summary: `Updated employee ${employee.employeeCode}`,
    });

    return ok(employee);
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const access = await resolveAccess();

    if (isResponse(access)) {
      return access;
    }

    if (access.user.role === "employee") {
      return forbidden("Your role does not allow this action");
    }

    const existingEmployee = await db.query.employees.findFirst({
      where: and(
        eq(employees.organizationId, access.organizationId),
        employeeIdentityFilter(id),
      ),
    });

    if (!existingEmployee) {
      return notFound("Employee not found");
    }

    await db
      .delete(employees)
      .where(
        and(
          eq(employees.id, existingEmployee.id),
          eq(employees.organizationId, access.organizationId),
        ),
      );
    await writeAuditLog({
      actorUserId: access.user.id,
      action: "delete",
      entityType: "employee",
      entityId: existingEmployee.id,
      summary: "Deleted employee",
    });
    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
