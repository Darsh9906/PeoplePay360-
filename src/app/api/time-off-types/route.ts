import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { timeOffTypes } from "@/db/schema";
import { writeAuditLog } from "../_lib/audit";
import { badRequest, created, ok, serverError } from "../_lib/responses";

const timeOffTypeSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(30),
  unit: z.enum(["days", "hours"]).default("days"),
  requiresAllocation: z.boolean().default(true),
  requiresApproval: z.boolean().default(true),
  isPaid: z.boolean().default(true),
  affectsPayroll: z.boolean().default(true),
  colorHex: z.string().min(4).max(9).default("#2563eb"),
  isActive: z.boolean().default(true),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    const rows = await db
      .select({
        id: timeOffTypes.id,
        name: timeOffTypes.name,
        code: timeOffTypes.code,
        unit: timeOffTypes.unit,
        requiresAllocation: timeOffTypes.requiresAllocation,
        requiresApproval: timeOffTypes.requiresApproval,
        isPaid: timeOffTypes.isPaid,
        affectsPayroll: timeOffTypes.affectsPayroll,
        colorHex: timeOffTypes.colorHex,
        isActive: timeOffTypes.isActive,
        allocationCount: sql<number>`(
          select count(*)::int from leave_allocations la
          where la.time_off_type_id = time_off_types.id
        )`,
        requestCount: sql<number>`(
          select count(*)::int from time_off_requests tor
          where tor.time_off_type_id = time_off_types.id
        )`,
      })
      .from(timeOffTypes)
      .where(activeOnly ? eq(timeOffTypes.isActive, true) : undefined)
      .orderBy(asc(timeOffTypes.name));

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = timeOffTypeSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [type] = await db
      .insert(timeOffTypes)
      .values(parsed.data)
      .returning();

    await writeAuditLog({
      action: "create",
      entityType: "time_off_type",
      entityId: type.id,
      summary: `Created time off type ${type.name}`,
    });

    return created(type);
  } catch (error) {
    return serverError(error);
  }
}
