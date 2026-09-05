import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { writeAuditLog } from "../../_lib/audit";
import { badRequest, noContent, notFound, ok, serverError } from "../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

const updateDocumentSchema = z.object({
  documentType: z.enum(["identity", "contract", "payslip", "tax", "other"]).optional(),
  fileName: z.string().min(1).optional(),
  fileUrl: z.string().min(1).optional(),
  mimeType: z.string().nullable().optional(),
});

export async function GET(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const document = await db.query.documents.findFirst({
      where: eq(documents.id, id),
    });

    if (!document) {
      return notFound("Document not found");
    }

    return ok(document);
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const parsed = updateDocumentSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [document] = await db
      .update(documents)
      .set(parsed.data)
      .where(eq(documents.id, id))
      .returning();

    if (!document) {
      return notFound("Document not found");
    }

    await writeAuditLog({
      action: "update",
      entityType: "document",
      entityId: id,
      summary: `Updated document ${document.fileName}`,
    });

    return ok(document);
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    await db.delete(documents).where(eq(documents.id, id));
    await writeAuditLog({
      action: "delete",
      entityType: "document",
      entityId: id,
      summary: "Deleted document",
    });
    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
