import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  employees,
  payruns,
  payslipLines,
  payslips,
} from "@/db/schema";
import { isResponse, requireRole } from "../../_lib/access";
import { writeAuditLog } from "../../_lib/audit";
import {
  badRequest,
  noContent,
  notFound,
  ok,
  serverError,
} from "../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Params) {
  try {
    const actor = await requireRole([
      "payroll_user",
      "payroll_manager",
      "admin",
    ]);

    if (isResponse(actor)) {
      return actor;
    }

    const { id } = await ctx.params;

    const payrun = await db.query.payruns.findFirst({
      where: eq(payruns.id, id),
      with: {
        salaryStructure: true,
        employees: {
          with: {
            employee: true,
          },
        },
        warnings: true,
      },
    });

    if (!payrun) {
      return notFound("Payrun not found");
    }

    const payslipRows = await db
      .select({
        id: payslips.id,
        employeeId: payslips.employeeId,
        employeeCode: employees.employeeCode,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
        workedDays: payslips.workedDays,
        leaveDays: payslips.leaveDays,
        grossPay: payslips.grossPay,
        totalDeductions: payslips.totalDeductions,
        netPay: payslips.netPay,
        status: payslips.status,
      })
      .from(payslips)
      .innerJoin(employees, eq(payslips.employeeId, employees.id))
      .where(eq(payslips.payrunId, id));

    const totals = await db
      .select({
        grossPay: sql<string>`coalesce(sum(${payslips.grossPay}), 0)::text`,
        totalDeductions: sql<string>`coalesce(sum(${payslips.totalDeductions}), 0)::text`,
        netPay: sql<string>`coalesce(sum(${payslips.netPay}), 0)::text`,
        payslipCount: sql<number>`count(${payslips.id})::int`,
      })
      .from(payslips)
      .where(eq(payslips.payrunId, id));

    return ok({
      ...payrun,
      selectedEmployees: payrun.employees.map((row) => row.employee),
      payslips: payslipRows,
      totals: totals[0],
      lineCount: await db
        .select({ count: sql<number>`count(${payslipLines.id})::int` })
        .from(payslipLines)
        .innerJoin(payslips, eq(payslipLines.payslipId, payslips.id))
        .where(eq(payslips.payrunId, id))
        .then((rows) => rows[0]?.count ?? 0),
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_request: Request, ctx: Params) {
  try {
    const actor = await requireRole([
      "payroll_user",
      "payroll_manager",
      "admin",
    ]);

    if (isResponse(actor)) {
      return actor;
    }

    const { id } = await ctx.params;

    const payrun = await db.query.payruns.findFirst({
      where: eq(payruns.id, id),
    });

    if (!payrun) {
      return notFound("Payrun not found");
    }

    // Paid payruns are historical records and must be preserved.
    if (payrun.status === "paid") {
      return badRequest("A paid payrun cannot be deleted");
    }

    await db.delete(payruns).where(eq(payruns.id, id));

    await writeAuditLog({
      action: "delete",
      entityType: "payrun",
      entityId: id,
      summary: `Deleted payrun ${payrun.name}`,
    });

    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
