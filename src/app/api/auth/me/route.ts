import { eq } from "drizzle-orm";
import { db } from "@/db";
import { employees, organizations } from "@/db/schema";
import { getSessionUser } from "../../_lib/auth";
import { ok, serverError, unauthorized } from "../../_lib/responses";

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return unauthorized();
    }

    // The workspace the session belongs to, shown in the sidebar header.
    const organization = user.organizationId
      ? ((
          await db
            .select({
              id: organizations.id,
              name: organizations.name,
              slug: organizations.slug,
              currency: organizations.currency,
            })
            .from(organizations)
            .where(eq(organizations.id, user.organizationId))
            .limit(1)
        )[0] ?? null)
      : null;

    // The employee record this login owns, if any. Employee-role screens need it.
    const [employee] = await db
      .select({
        id: employees.id,
        employeeCode: employees.employeeCode,
        firstName: employees.firstName,
        lastName: employees.lastName,
        jobTitle: employees.jobTitle,
      })
      .from(employees)
      .where(eq(employees.userId, user.id))
      .limit(1);

    return ok({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      organization,
      employee: employee ?? null,
    });
  } catch (error) {
    return serverError(error);
  }
}
