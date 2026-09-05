import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { employees, organizations, sessions, users } from "@/db/schema";
import { NO_MATCH, isResponse, requireRole } from "../../_lib/access";
import { hashPassword } from "../../_lib/auth";
import { writeAuditLog } from "../../_lib/audit";
import { badRequest, noContent, notFound, ok, serverError } from "../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z
    .enum(["employee", "hr_manager", "payroll_user", "payroll_manager", "admin"])
    .optional(),
  status: z.enum(["invited", "active", "inactive", "suspended"]).optional(),
  employeeId: z.string().uuid().nullable().optional(),
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

export async function GET(_request: Request, ctx: Params) {
  try {
    const actor = await requireRole(["admin"]);

    if (isResponse(actor)) {
      return actor;
    }

    const { id } = await ctx.params;
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.id, id),
        eq(users.organizationId, actor.organizationId ?? NO_MATCH),
      ),
      with: {
        employee: true,
        sessions: true,
      },
    });

    if (!user) {
      return notFound("User not found");
    }

    return ok({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      employee: user.employee,
      activeSessions: user.sessions.filter((session) => !session.revokedAt).length,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request, ctx: Params) {
  try {
    const actor = await requireRole(["admin"]);

    if (isResponse(actor)) {
      return actor;
    }

    const { id } = await ctx.params;
    const parsed = updateUserSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const data = parsed.data;
    const updateData: {
      name?: string;
      email?: string;
      role?: "employee" | "hr_manager" | "payroll_user" | "payroll_manager" | "admin";
      status?: "invited" | "active" | "inactive" | "suspended";
      passwordHash?: string;
      passwordChangedAt?: Date;
    } = {};

    if (data.name) updateData.name = data.name;
    if (data.email) {
      const email = data.email.toLowerCase().trim();
      const emailError = await validateWorkspaceEmail(email, actor.organizationId);

      if (emailError) {
        return badRequest(emailError);
      }

      updateData.email = email;
    }
    if (data.role) updateData.role = data.role;
    if (data.status) updateData.status = data.status;
    if (data.password) {
      updateData.passwordHash = hashPassword(data.password);
      updateData.passwordChangedAt = new Date();
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(
        and(
          eq(users.id, id),
          eq(users.organizationId, actor.organizationId ?? NO_MATCH),
        ),
      )
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
      });

    if (!user) {
      return notFound("User not found");
    }

    if (data.employeeId !== undefined) {
      await db.update(employees).set({ userId: null }).where(eq(employees.userId, id));
      if (data.employeeId) {
        await db
          .update(employees)
          .set({ userId: id })
          .where(
            and(
              eq(employees.id, data.employeeId),
              eq(employees.organizationId, actor.organizationId ?? NO_MATCH),
            ),
          );
      }
    }

    await writeAuditLog({
      actorUserId: actor.id,
      action: "update",
      entityType: "user",
      entityId: id,
      summary: `Updated user ${user.email}`,
    });

    return ok(user);
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_request: Request, ctx: Params) {
  try {
    const actor = await requireRole(["admin"]);

    if (isResponse(actor)) {
      return actor;
    }

    const { id } = await ctx.params;
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, id),
          eq(users.organizationId, actor.organizationId ?? NO_MATCH),
        ),
      )
      .limit(1);

    if (!user) {
      return notFound("User not found");
    }

    await db.update(employees).set({ userId: null }).where(eq(employees.userId, id));
    await db.delete(sessions).where(eq(sessions.userId, id));
    await db.delete(users).where(eq(users.id, id));
    await writeAuditLog({
      actorUserId: actor.id,
      action: "delete",
      entityType: "user",
      entityId: id,
      summary: "Deleted user",
    });
    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
