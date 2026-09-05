import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  contracts,
  departments,
  employees,
  salaryStructures,
} from "@/db/schema";
import { writeAuditLog } from "../_lib/audit";
import { badRequest, created, ok, serverError } from "../_lib/responses";

const createContractSchema = z.object({
  employeeId: z.string().uuid(),
  startDate: z.string().min(1),
  endDate: z.string().nullable().optional(),
  status: z.enum(["active", "expired", "terminated"]).default("active"),
  monthlyWage: z.coerce.number().positive(),
  currency: z.string().length(3).default("INR"),
  salaryStructureId: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
});

function getDisplayStatus(status: "active" | "expired" | "terminated") {
  if (status === "active") return "Running";
  return "Expired";
}

export async function GET() {
  try {
    const rows = await db
      .select({
        id: contracts.id,
        employeeId: contracts.employeeId,
        employeeCode: employees.employeeCode,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
        department: departments.name,
        jobTitle: employees.jobTitle,
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
      .orderBy(desc(contracts.startDate));

    return ok(
      rows.map((contract) => ({
        ...contract,
        contractType: "Full Time",
        salary: Number(contract.monthlyWage),
        workingSchedule: "Standard 40h/week",
        endDate: contract.endDate ?? "Ongoing",
        displayStatus: getDisplayStatus(contract.status),
      })),
    );
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = createContractSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [contract] = await db
      .insert(contracts)
      .values({
        ...parsed.data,
        monthlyWage: parsed.data.monthlyWage.toFixed(2),
      })
      .returning();

    await writeAuditLog({
      action: "create",
      entityType: "contract",
      entityId: contract.id,
      summary: "Created contract",
    });

    return created(contract);
  } catch (error) {
    return serverError(error);
  }
}
