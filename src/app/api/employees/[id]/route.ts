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

    // An employee may only open their own record.
    if (access.scopeEmployeeId && access.scopeEmployeeId !== id) {
      return forbidden("You can only view your own employee record");
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
      .where(eq(employees.id, id))
      .limit(1);

    if (!employee[0]) {
      return notFound("Employee not found");
    }

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
          .where(eq(contracts.employeeId, id))
          .orderBy(desc(contracts.startDate)),
        db
          .select()
          .from(attendanceRecords)
          .where(eq(attendanceRecords.employeeId, id))
          .orderBy(desc(attendanceRecords.attendanceDate))
          .limit(10),
        db
          .select()
          .from(timeOffRequests)
          .where(eq(timeOffRequests.employeeId, id))
          .orderBy(desc(timeOffRequests.startDate))
          .limit(10),
        db
          .select()
          .from(payslips)
          .where(and(eq(payslips.employeeId, id)))
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
          .where(eq(leaveAllocations.employeeId, id))
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
          .where(eq(employeeWorkingSchedules.employeeId, id))
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
    const parsed = updateEmployeeSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const updateData = {
      ...parsed.data,
      workEmail: parsed.data.workEmail?.toLowerCase(),
    };

    const [employee] = await db
      .update(employees)
      .set(updateData)
      .where(eq(employees.id, id))
      .returning();

    if (!employee) {
      return notFound("Employee not found");
    }

    await writeAuditLog({
      action: "update",
      entityType: "employee",
      entityId: id,
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
    await db.delete(employees).where(eq(employees.id, id));
    await writeAuditLog({
      action: "delete",
      entityType: "employee",
      entityId: id,
      summary: "Deleted employee",
    });
    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
