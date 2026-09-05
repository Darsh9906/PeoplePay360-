import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  contracts,
  departments,
  employees,
  salaryStructures,
} from "@/db/schema";
import { notFound, ok, serverError } from "../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

function getDisplayStatus(status: "active" | "expired" | "terminated") {
  if (status === "active") return "Running";
  return "Expired";
}

export async function GET(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;

    const rows = await db
      .select({
        id: contracts.id,
        employeeId: contracts.employeeId,
        employeeCode: employees.employeeCode,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
        department: departments.name,
        jobTitle: employees.jobTitle,
        employeeStatus: employees.status,
        startDate: contracts.startDate,
        endDate: contracts.endDate,
        status: contracts.status,
        monthlyWage: contracts.monthlyWage,
        currency: contracts.currency,
        salaryStructureId: contracts.salaryStructureId,
        salaryStructure: salaryStructures.name,
      })
      .from(contracts)
      .innerJoin(employees, eq(contracts.employeeId, employees.id))
      .innerJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(
        salaryStructures,
        eq(contracts.salaryStructureId, salaryStructures.id),
      )
      .where(eq(contracts.id, id))
      .limit(1);

    const contract = rows[0];

    if (!contract) {
      return notFound("Contract not found");
    }

    return ok({
      ...contract,
      contractType: "Full Time",
      salary: Number(contract.monthlyWage),
      workingSchedule: "Standard 40h/week",
      endDate: contract.endDate ?? "Ongoing",
      displayStatus: getDisplayStatus(contract.status),
    });
  } catch (error) {
    return serverError(error);
  }
}
