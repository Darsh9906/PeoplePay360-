import { db } from "@/db";
import { auditLogs } from "@/db/schema";

type AuditInput = {
  actorUserId?: string | null;
  action:
    | "create"
    | "update"
    | "delete"
    | "login"
    | "logout"
    | "approve"
    | "reject"
    | "compute"
    | "pay";
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: unknown;
};

export async function writeAuditLog(input: AuditInput) {
  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    summary: input.summary,
    metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
  });
}
