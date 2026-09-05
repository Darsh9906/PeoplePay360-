import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { departments, employees } from "@/db/schema";
import { NO_MATCH, isResponse, requireRole } from "../../_lib/access";
import { badRequest, ok, serverError } from "../../_lib/responses";

/**
 * Step 2 of the payrun wizard: the employees who can be included for a period,
 * each annotated with the issues an officer should see before selecting them.
 */
export async function GET(request: Request) {
  try {
    const actor = await requireRole(["payroll_user", "payroll_manager", "admin"]);

    if (isResponse(actor)) {
      return actor;
    }

    const { searchParams } = new URL(request.url);
    const periodStart = searchParams.get("periodStart");
    const periodEnd = searchParams.get("periodEnd");
    const departmentId = searchParams.get("departmentId");

    if (!periodStart || !periodEnd) {
      return badRequest("periodStart and periodEnd are required");
    }

    if (periodEnd < periodStart) {
      return badRequest("periodEnd cannot be before periodStart");
    }

    const rows = await db
      .select({
        id: employees.id,
        employeeCode: employees.employeeCode,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
        workEmail: employees.workEmail,
        jobTitle: employees.jobTitle,
        departmentId: employees.departmentId,
        department: departments.name,
        status: employees.status,
        // The contract that actually applies to this period, if any.
        contractId: sql<string | null>`(
          select c.id from contracts c
          where c.employee_id = employees.id
            and c.status = 'active'
            and c.start_date <= ${periodEnd}
            and (c.end_date is null or c.end_date >= ${periodStart})
          order by c.start_date desc
          limit 1
        )`,
        monthlyWage: sql<string | null>`(
          select c.monthly_wage::text from contracts c
          where c.employee_id = employees.id
            and c.status = 'active'
            and c.start_date <= ${periodEnd}
            and (c.end_date is null or c.end_date >= ${periodStart})
          order by c.start_date desc
          limit 1
        )`,
        contractCount: sql<number>`(
          select count(*)::int from contracts c
          where c.employee_id = employees.id
            and c.status = 'active'
            and c.start_date <= ${periodEnd}
            and (c.end_date is null or c.end_date >= ${periodStart})
        )`,
        hasBankAccount: sql<boolean>`exists (
          select 1 from employee_bank_accounts b
          where b.employee_id = employees.id
        )`,
        existingPayrunName: sql<string | null>`(
          select p.name from payslips s
          join payruns p on p.id = s.payrun_id
          where s.employee_id = employees.id
            and p.period_start <= ${periodEnd}
            and p.period_end >= ${periodStart}
          limit 1
        )`,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(
        and(
          eq(employees.organizationId, actor.organizationId ?? NO_MATCH),
          eq(employees.status, "active"),
          ...(departmentId ? [eq(employees.departmentId, departmentId)] : []),
        ),
      )
      .orderBy(asc(employees.firstName));

    return ok(
      rows.map((row) => {
        const issues: string[] = [];

        if (!row.contractId) {
          issues.push("No active contract for this period");
        }

        if (row.contractCount > 1) {
          issues.push(`${row.contractCount} overlapping active contracts`);
        }

        if (!row.hasBankAccount) {
          issues.push("No bank account on file");
        }

        if (row.existingPayrunName) {
          issues.push(`Already in "${row.existingPayrunName}"`);
        }

        return {
          ...row,
          // Eligible means payable; issues are still shown as warnings.
          eligible: Boolean(row.contractId),
          issues,
        };
      }),
    );
  } catch (error) {
    return serverError(error);
  }
}
