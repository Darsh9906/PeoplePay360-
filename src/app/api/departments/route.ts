import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { departments, employees } from "@/db/schema";
import { writeAuditLog } from "../_lib/audit";
import { badRequest, created, ok, serverError } from "../_lib/responses";

const departmentSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
});

export async function GET() {
  try {
    const rows = await db
      .select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        employeeCount: sql<number>`count(${employees.id})::int`,
      })
      .from(departments)
      .leftJoin(employees, eq(employees.departmentId, departments.id))
      .groupBy(departments.id)
      .orderBy(asc(departments.name));

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = departmentSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [department] = await db
      .insert(departments)
      .values(parsed.data)
      .returning();

    await writeAuditLog({
      action: "create",
      entityType: "department",
      entityId: department.id,
      summary: `Created department ${department.code}`,
    });

    return created(department);
  } catch (error) {
    return serverError(error);
  }
}
