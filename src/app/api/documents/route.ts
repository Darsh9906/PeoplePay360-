import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { writeAuditLog } from "../_lib/audit";
import { badRequest, created, ok, serverError } from "../_lib/responses";

const documentSchema = z.object({
  entityType: z.enum(["employee", "contract", "payslip", "payrun"]),
  entityId: z.string().uuid(),
  documentType: z.enum(["identity", "contract", "payslip", "tax", "other"]).default("other"),
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
  mimeType: z.string().optional(),
  uploadedBy: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const filters = [
      entityType === "employee" || entityType === "contract" || entityType === "payslip" || entityType === "payrun"
        ? eq(documents.entityType, entityType)
        : undefined,
      entityId ? eq(documents.entityId, entityId) : undefined,
    ].filter(Boolean);

    const rows = await db
      .select()
      .from(documents)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(documents.createdAt));

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = documentSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [document] = await db.insert(documents).values(parsed.data).returning();
    await writeAuditLog({
      actorUserId: parsed.data.uploadedBy,
      action: "create",
      entityType: "document",
      entityId: document.id,
      summary: `Uploaded document ${document.fileName}`,
    });

    return created(document);
  } catch (error) {
    return serverError(error);
  }
}
