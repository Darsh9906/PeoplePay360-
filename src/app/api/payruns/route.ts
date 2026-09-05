import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
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
          where: eq(salaryStructures.isActive, true),
        })
      )?.id;

    const [payrun] = await db
      .insert(payruns)
      .values({
        organizationId: actor.organizationId ?? NO_MATCH,
        name: body.name ?? `Payroll ${body.periodStart} to ${body.periodEnd}`,
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        salaryStructureId,
        status: "draft",
      })
      .returning();

    if (body.employeeIds?.length) {
      await db.insert(payrunEmployees).values(
        body.employeeIds.map((employeeId) => ({
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
