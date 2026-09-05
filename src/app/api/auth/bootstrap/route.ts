import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "../../_lib/auth";
import { badRequest, created, forbidden, serverError } from "../../_lib/responses";

const bootstrapSchema = z.object({
  name: z.string().min(1).default("PeoplePay360 Admin"),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const [count] = await db
      .select({ total: sql<number>`count(${users.id})::int` })
      .from(users);

    if ((count?.total ?? 0) > 0) {
      return forbidden("Bootstrap is only allowed before users exist");
    }

    const parsed = bootstrapSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [user] = await db
      .insert(users)
      .values({
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        role: "admin",
        status: "active",
        passwordHash: hashPassword(parsed.data.password),
        emailVerifiedAt: new Date(),
        passwordChangedAt: new Date(),
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
      });

    return created(user);
  } catch (error) {
    return serverError(error);
  }
}
