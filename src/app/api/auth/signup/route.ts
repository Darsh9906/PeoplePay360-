import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { organizations, users } from "@/db/schema";
import {
  createUserSession,
  hashPassword,
  sessionCookie,
} from "../../_lib/auth";
import { writeAuditLog } from "../../_lib/audit";
import {
  badRequest,
  conflict,
  created,
  serverError,
} from "../../_lib/responses";

/**
 * Free mailbox providers. A company signing up for a payroll workspace should
 * use its own domain, which is also what later identifies its people.
 */
const consumerDomains = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.in",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "rediffmail.com",
  "mail.com",
  "gmx.com",
  "yandex.com",
  "zoho.com",
]);

const signupSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  fullName: z.string().min(2, "Your name is required"),
  workEmail: z.string().email("Enter a valid work email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  companySize: z.string().optional(),
  industry: z.string().optional(),
  countryCode: z.string().length(2).default("IN"),
  currency: z.string().length(3).default("INR"),
});

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "workspace"
  );
}

export async function POST(request: Request) {
  try {
    const parsed = signupSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const { companyName, fullName, workEmail, password } = parsed.data;
    const email = workEmail.toLowerCase().trim();
    const domain = email.split("@")[1] ?? "";

    if (consumerDomains.has(domain)) {
      return badRequest(
        "Use your company email address, not a personal one, so your team can be recognised by its domain.",
      );
    }

    // A domain may only claim one workspace, so a colleague joining later is
    // invited by their admin rather than creating a duplicate company.
    const [existingOrg] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(sql`lower(${organizations.emailDomain}) = ${domain}`)
      .limit(1);

    if (existingOrg) {
      return conflict(
        `${existingOrg.name} already has a workspace for ${domain}. Ask your administrator to create an account for you.`,
      );
    }

    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);

    if (existingUser) {
      return conflict("An account with this email already exists");
    }

    const [organization] = await db
      .insert(organizations)
      .values({
        name: companyName.trim(),
        slug: slugify(companyName),
        emailDomain: domain,
        industry: parsed.data.industry,
        companySize: parsed.data.companySize,
        countryCode: parsed.data.countryCode.toUpperCase(),
        currency: parsed.data.currency.toUpperCase(),
      })
      .returning();

    const now = new Date();

    // The signing-up person is the workspace administrator.
    const [admin] = await db
      .insert(users)
      .values({
        organizationId: organization.id,
        name: fullName.trim(),
        email,
        role: "admin",
        status: "active",
        passwordHash: hashPassword(password),
        mustChangePassword: false,
        emailVerifiedAt: now,
        passwordChangedAt: now,
      })
      .returning();

    await writeAuditLog({
      actorUserId: admin.id,
      action: "create",
      entityType: "organization",
      entityId: organization.id,
      summary: `Created workspace ${organization.name}`,
    });

    // Sign them straight in so signup lands on the dashboard, not the login page.
    const session = await createUserSession(admin.id);

    return created(
      {
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          status: admin.status,
          mustChangePassword: false,
        },
      },
      {
        headers: {
          "Set-Cookie": sessionCookie(session.token, session.expiresAt),
        },
      },
    );
  } catch (error) {
    return serverError(error);
  }
}

/**
 * Signup availability. With no `domain` query it simply reports that signup is
 * open; with one it says whether that company already has a workspace.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain")?.toLowerCase().trim();

    if (!domain) {
      return Response.json({ data: { signupOpen: true, organization: null } });
    }

    const [organization] = await db
      .select({ name: organizations.name, slug: organizations.slug })
      .from(organizations)
      .where(sql`lower(${organizations.emailDomain}) = ${domain}`)
      .limit(1);

    return Response.json({
      data: { signupOpen: !organization, organization: organization ?? null },
    });
  } catch (error) {
    return serverError(error);
  }
}
