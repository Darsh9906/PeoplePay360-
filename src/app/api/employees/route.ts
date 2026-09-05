import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { departments, employees } from "@/db/schema";
import { ok, serverError } from "../_lib/responses";

export async function GET() {
  try {
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
      })
      .from(employees)
      .innerJoin(departments, eq(employees.departmentId, departments.id))
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
