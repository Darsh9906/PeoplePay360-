import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { employees, notifications, organizations, users } from "@/db/schema";
import { roleLabels } from "@/src/lib/rbac";
import { generateTempPassword, hashPassword } from "../_lib/auth";
import { NO_MATCH, isResponse, requireRole } from "../_lib/access";
import { writeAuditLog } from "../_lib/audit";
import { badRequest, created, ok, serverError } from "../_lib/responses";

const roleSchema = z.enum([
  "employee",
  "hr_manager",
  "payroll_user",
  "payroll_manager",
  "admin",
]);

const userStatusSchema = z.enum(["invited", "active", "inactive", "suspended"]);

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email address"),
  role: roleSchema.default("employee"),
  status: userStatusSchema.default("active"),
  employeeId: z.string().uuid().optional(),
  /** Set a password directly instead of mailing a temporary one. */
  password: z.string().min(8).optional(),
});

async function organizationDomain(organizationId: string | null) {
  if (!organizationId) return null;

  const [organization] = await db
    .select({ emailDomain: organizations.emailDomain })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  return organization?.emailDomain?.toLowerCase() ?? null;
}

async function validateWorkspaceEmail(email: string, organizationId: string | null) {
  const domain = await organizationDomain(organizationId);

  if (!domain) {
    return "This admin is not linked to an organization workspace";
  }

  if (!email.endsWith(`@${domain}`)) {
    return `Use an email from your organization domain: ${domain}`;
  }

  return null;
}

export async function GET(request: Request) {
  try {
    // User administration is admin-only.
    const actor = await requireRole(["admin"]);

    if (isResponse(actor)) {
      return actor;
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const status = searchParams.get("status");

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        mustChangePassword: users.mustChangePassword,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        employeeId: employees.id,
        employeeCode: employees.employeeCode,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
      })
      .from(users)
      .leftJoin(employees, eq(employees.userId, users.id))
      .where(eq(users.organizationId, actor.organizationId ?? NO_MATCH))
      .orderBy(asc(users.name));

    return ok(
      rows.filter((user) => {
        const roleMatches = !role || user.role === role;
        const statusMatches = !status || user.status === status;
        return roleMatches && statusMatches;
      }),
    );
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRole(["admin"]);

    if (isResponse(actor)) {
      return actor;
    }

    const parsed = createUserSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const email = parsed.data.email.toLowerCase().trim();
    const emailError = await validateWorkspaceEmail(email, actor.organizationId);

    if (emailError) {
      return badRequest(emailError);
    }

    // An admin-created account gets a temporary password it must replace,
    // unless the admin explicitly set one.
    const usesTempPassword = !parsed.data.password;
    const plainPassword = parsed.data.password ?? generateTempPassword();

    const [user] = await db
      .insert(users)
      .values({
        organizationId: actor.organizationId ?? null,
        name: parsed.data.name.trim(),
        email,
        role: parsed.data.role,
        status: "active",
        passwordHash: hashPassword(plainPassword),
        mustChangePassword: usesTempPassword,
        passwordChangedAt: usesTempPassword ? null : new Date(),
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        mustChangePassword: users.mustChangePassword,
      });

    if (parsed.data.employeeId) {
      await db
        .update(employees)
        .set({ userId: user.id })
        .where(eq(employees.id, parsed.data.employeeId));
    }

    await db.insert(notifications).values({
      userId: user.id,
      title: "Your account is ready",
      message: `An administrator created your ${roleLabels[user.role]} account.`,
      status: "pending",
    });

    await writeAuditLog({
      actorUserId: actor.id,
      action: "create",
      entityType: "user",
      entityId: user.id,
      summary: `Created ${roleLabels[user.role]} account for ${user.email}`,
    });

    // The admin hands these credentials over directly. There is no mail
    // provider in the loop, so nothing can silently fail to arrive.
    return created({
      ...user,
      tempPassword: usesTempPassword ? plainPassword : undefined,
    });
  } catch (error) {
    return serverError(error);
  }
}
