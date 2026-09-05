import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  attendanceRecords,
  contracts,
  departments,
  employees,
  payslips,
  timeOffRequests,
} from "@/db/schema";
import { writeAuditLog } from "../../_lib/audit";
import { badRequest, noContent, notFound, ok, serverError } from "../../_lib/responses";

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
      })
      .from(employees)
      .innerJoin(departments, eq(employees.departmentId, departments.id))
      .where(eq(employees.id, id))
      .limit(1);

    if (!employee[0]) {
      return notFound("Employee not found");
    }

    const [employeeContracts, attendance, timeOff, employeePayslips] =
      await Promise.all([
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
      ]);

    return ok({
      ...employee[0],
      fullName: `${employee[0].firstName} ${employee[0].lastName}`,
      contracts: employeeContracts,
      attendance,
      timeOff,
      payslips: employeePayslips,
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
