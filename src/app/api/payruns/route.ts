import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  payrunEmployees,
  payruns,
  salaryStructures,
} from "@/db/schema";
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
    const rows = await db.query.payruns.findMany({
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
