import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceRecords,
  contracts,
  departments,
  employees,
  payslips,
  timeOffRequests,
} from "@/db/schema";
import { notFound, ok, serverError } from "../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

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
