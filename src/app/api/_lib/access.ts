import { eq } from "drizzle-orm";
import { db } from "@/db";
import { employees, organizations } from "@/db/schema";
import { getSessionUser } from "./auth";
import { forbidden, unauthorized } from "./responses";

export type Role =
  | "employee"
  | "hr_manager"
  | "payroll_user"
  | "payroll_manager"
  | "admin";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string | null;
  mustChangePassword: boolean;
};

/** Roles with full CRUD over HR master data. */
const hrRoles: Role[] = ["hr_manager", "payroll_user", "payroll_manager", "admin"];
/** Roles allowed to read payroll (payruns, payslips, structures, rules). */
const payrollReadRoles: Role[] = ["payroll_user", "payroll_manager", "admin"];
/** Roles allowed to configure salary structures and rules. */
const payrollAdminRoles: Role[] = ["payroll_manager", "admin"];

/** A valid UUID guaranteed to match no row. */
export const NO_MATCH = "00000000-0000-0000-0000-000000000000";

export function isHrRole(role: Role) {
  return hrRoles.includes(role);
}

export function canReadPayroll(role: Role) {
  return payrollReadRoles.includes(role);
}

export function canAdminPayroll(role: Role) {
  return payrollAdminRoles.includes(role);
}

/**
 * The employee record linked to a session user, or null when they are not
 * linked to one. Used to scope "own records only" access.
 */
export async function linkedEmployeeId(userId: string) {
  const [employee] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.userId, userId))
    .limit(1);

  return employee?.id ?? null;
}

type Access = {
  user: SessionUser;
  /**
   * The workspace every query must be confined to. Never null for a signed-in
   * user, so a tenant can never read another tenant's rows.
   */
  organizationId: string;
  /**
   * Set only for the `employee` role: every query must be restricted to this
   * employee's own rows. Null for roles that may see all records.
   */
  scopeEmployeeId: string | null;
};

/**
 * Resolves the caller and the row scope they are allowed to read.
 * Returns a Response to short-circuit when the caller is not signed in.
 */
export async function resolveAccess(): Promise<Access | Response> {
  const user = (await getSessionUser()) as SessionUser | null;

  if (!user) {
    return unauthorized("Sign in to continue");
  }

  // A temporary password only unlocks the password-change endpoint.
  if (user.mustChangePassword) {
    return forbidden("Set your own password before using the workspace");
  }

  // A UUID that matches nothing, used when a user has no workspace yet.
  const organizationId = user.organizationId ?? NO_MATCH;

  if (user.role === "employee") {
    const employeeId = await linkedEmployeeId(user.id);

    // Same sentinel, so an unlinked account sees nothing instead of tripping a
    // type error in the query.
    return {
      user,
      organizationId,
      scopeEmployeeId: employeeId ?? NO_MATCH,
    };
  }

  return { user, organizationId, scopeEmployeeId: null };
}

/** Resolves the caller and rejects any role outside `allowed`. */
export async function requireRole(
  allowed: Role[],
): Promise<SessionUser | Response> {
  const user = (await getSessionUser()) as SessionUser | null;

  if (!user) {
    return unauthorized("Sign in to continue");
  }

  if (user.mustChangePassword) {
    return forbidden("Set your own password before using the workspace");
  }

  if (!allowed.includes(user.role)) {
    return forbidden("Your role does not allow this action");
  }

  return user;
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}

/** Workspace name for the acting user, used in outgoing email. */
export async function organizationNameFor(organizationId: string | null) {
  if (!organizationId) {
    return null;
  }

  const [organization] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  return organization?.name ?? null;
}
