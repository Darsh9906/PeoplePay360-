import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentTransactions } from "@/db/schema";
import { ok, serverError } from "../_lib/responses";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");
    const employeeId = searchParams.get("employeeId");
    const filters = [
      batchId ? eq(paymentTransactions.batchId, batchId) : undefined,
      employeeId ? eq(paymentTransactions.employeeId, employeeId) : undefined,
    ].filter(Boolean);

    const rows = await db
      .select()
      .from(paymentTransactions)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(paymentTransactions.createdAt));

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}
