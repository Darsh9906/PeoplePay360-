import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { employees, sessions, users } from "@/db/schema";
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

export async function GET(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
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
    if (data.email) updateData.email = data.email.toLowerCase();
    if (data.role) updateData.role = data.role;
    if (data.status) updateData.status = data.status;
    if (data.password) {
      updateData.passwordHash = hashPassword(data.password);
      updateData.passwordChangedAt = new Date();
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
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
          .where(eq(employees.id, data.employeeId));
      }
    }

    await writeAuditLog({
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
    const { id } = await ctx.params;
    await db.update(employees).set({ userId: null }).where(eq(employees.userId, id));
    await db.delete(sessions).where(eq(sessions.userId, id));
    await db.delete(users).where(eq(users.id, id));
    await writeAuditLog({
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
