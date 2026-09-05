import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  employees,
  payrunEmployees,
  payruns,
  salaryStructures,
} from "@/db/schema";
import { NO_MATCH, isResponse, requireRole } from "../_lib/access";
import { badRequest, created, ok, serverError } from "../_lib/responses";

type CreatePayrunBody = {
  name?: string;
  periodStart?: string;
  periodEnd?: string;
  salaryStructureId?: string;
  employeeIds?: string[];
};

export async function GET() {
  try {
    const actor = await requireRole(["payroll_user", "payroll_manager", "admin"]);

    if (isResponse(actor)) {
      return actor;
    }

    const rows = await db.query.payruns.findMany({
      where: eq(payruns.organizationId, actor.organizationId ?? NO_MATCH),
      with: {
        salaryStructure: true,
        employees: true,
        payslips: true,
        warnings: true,
      },
      orderBy: desc(payruns.createdAt),
    });

    return ok(
      rows.map((payrun) => ({
        ...payrun,
        employeeCount: payrun.employees.length,
        payslipCount: payrun.payslips.length,
        warningCount: payrun.warnings.length,
      })),
    );
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRole(["payroll_user", "payroll_manager", "admin"]);

    if (isResponse(actor)) {
      return actor;
    }

    const body = (await request.json()) as CreatePayrunBody;

    if (!body.periodStart || !body.periodEnd) {
      return badRequest("periodStart and periodEnd are required");
    }

    const salaryStructureId =
      body.salaryStructureId ??
      (
        await db.query.salaryStructures.findFirst({
          where: and(
            eq(salaryStructures.organizationId, actor.organizationId ?? NO_MATCH),
            eq(salaryStructures.isActive, true),
          ),
        })
      )?.id;

    if (body.salaryStructureId) {
      const selectedStructure = await db.query.salaryStructures.findFirst({
        where: and(
          eq(salaryStructures.id, body.salaryStructureId),
          eq(salaryStructures.organizationId, actor.organizationId ?? NO_MATCH),
        ),
      });

      if (!selectedStructure) {
        return badRequest("Selected salary structure is not available");
      }
    }

    const scopedEmployees = body.employeeIds?.length
      ? await db
          .select({ id: employees.id })
          .from(employees)
          .where(
            and(
              eq(employees.organizationId, actor.organizationId ?? NO_MATCH),
              inArray(employees.id, body.employeeIds),
            ),
          )
      : [];

    if (body.employeeIds?.length && scopedEmployees.length !== body.employeeIds.length) {
      return badRequest("One or more selected employees are not available");
    }

    const [payrun] = await db
      .insert(payruns)
      .values({
        organizationId: actor.organizationId ?? NO_MATCH,
        name: body.name ?? `Payroll ${body.periodStart} to ${body.periodEnd}`,
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        salaryStructureId,
        status: "draft",
        createdBy: actor.id,
      })
      .returning();

    if (body.employeeIds?.length) {
      await db.insert(payrunEmployees).values(
        scopedEmployees.map(({ id: employeeId }) => ({
          payrunId: payrun.id,
          employeeId,
        })),
      );
    }

    return created(payrun);
  } catch (error) {
    return serverError(error);
  }
}
