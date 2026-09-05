import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  contracts,
  departments,
  employees,
  salaryStructures,
} from "@/db/schema";
import { writeAuditLog } from "../../_lib/audit";
import { badRequest, noContent, notFound, ok, serverError } from "../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

const updateContractSchema = z.object({
  employeeId: z.string().uuid().optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().nullable().optional(),
  status: z.enum(["active", "expired", "terminated"]).optional(),
  monthlyWage: z.coerce.number().positive().optional(),
  currency: z.string().length(3).optional(),
  salaryStructureId: z.string().uuid().nullable().optional(),
  approvedBy: z.string().uuid().nullable().optional(),
  approvedAt: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
});

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

export async function PATCH(request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const parsed = updateContractSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [contract] = await db
      .update(contracts)
      .set({
        ...parsed.data,
        monthlyWage: parsed.data.monthlyWage?.toFixed(2),
        approvedAt: parsed.data.approvedAt ? new Date(parsed.data.approvedAt) : undefined,
      })
      .where(eq(contracts.id, id))
      .returning();

    if (!contract) {
      return notFound("Contract not found");
    }

    await writeAuditLog({
      action: "update",
      entityType: "contract",
      entityId: id,
      summary: "Updated contract",
    });

    return ok(contract);
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    await db.delete(contracts).where(eq(contracts.id, id));
    await writeAuditLog({
      action: "delete",
      entityType: "contract",
      entityId: id,
      summary: "Deleted contract",
    });
    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
