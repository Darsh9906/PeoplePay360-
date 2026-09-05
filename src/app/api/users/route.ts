import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { employees, inviteTokens, notifications, users } from "@/db/schema";
import { createToken, hashPassword, hashToken } from "../_lib/auth";
import { writeAuditLog } from "../_lib/audit";
import { sendInviteEmail } from "../_lib/email";
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
  name: z.string().min(1),
  email: z.string().email(),
  role: roleSchema.default("employee"),
  status: userStatusSchema.default("invited"),
  employeeId: z.string().uuid().optional(),
  password: z.string().min(8).optional(),
});

export async function GET(request: Request) {
  try {
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
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        employeeId: employees.id,
        employeeCode: employees.employeeCode,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
      })
      .from(users)
      .leftJoin(employees, eq(employees.userId, users.id))
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
    const parsed = createUserSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const token = createToken();
    const passwordHash = parsed.data.password
      ? hashPassword(parsed.data.password)
      : null;

    const [user] = await db
      .insert(users)
      .values({
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
        status: passwordHash ? "active" : parsed.data.status,
        passwordHash,
        passwordChangedAt: passwordHash ? new Date() : null,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
      });

    if (parsed.data.employeeId) {
      await db
        .update(employees)
        .set({ userId: user.id })
        .where(eq(employees.id, parsed.data.employeeId));
    }

    if (!passwordHash) {
      await db.insert(inviteTokens).values({
        userId: user.id,
        email: user.email,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
      });
      await sendInviteEmail({
        userId: user.id,
        name: user.name,
        email: user.email,
        token,
      });
    }

    await db.insert(notifications).values({
      userId: user.id,
      title: "PeoplePay360 access created",
      message: "Your workspace access has been created.",
      status: "pending",
    });

    await writeAuditLog({
      action: "create",
      entityType: "user",
      entityId: user.id,
      summary: `Created user ${user.email}`,
    });

    return created({
      ...user,
      inviteToken: passwordHash ? undefined : token,
    });
  } catch (error) {
    return serverError(error);
  }
}
