export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json({ data }, init);
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export function unauthorized(message = "Unauthorized") {
  return Response.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return Response.json({ error: message }, { status: 403 });
}

export function notFound(message = "Not found") {
  return Response.json({ error: message }, { status: 404 });
}

export function noContent() {
  return new Response(null, { status: 204 });
}

export function conflict(message: string) {
  return Response.json({ error: message }, { status: 409 });
}

/** Friendly messages for the unique constraints users can actually hit. */
const uniqueConstraintMessages: Record<string, string> = {
  employees_code_idx: "An employee with this code already exists",
  employees_work_email_idx: "An employee with this work email already exists",
  users_email_idx: "A user with this email already exists",
  attendance_employee_date_idx:
    "An attendance record already exists for this employee on this date",
  payslips_payrun_employee_idx:
    "This employee already has a payslip in this pay run",
  working_schedules_name_idx: "A working schedule with this name already exists",
  time_off_types_code_idx: "A time off type with this code already exists",
  statutory_settings_code_idx: "A statutory setting with this code already exists",
  payment_batches_payrun_idx: "This pay run already has a payment batch",
};

type PostgresError = {
  code?: string;
  constraint?: string;
  detail?: string;
  cause?: unknown;
};

/** Drizzle wraps driver errors, so walk the cause chain for the PG fields. */
function findPostgresError(error: unknown): PostgresError | null {
  let current = error as PostgresError | undefined;

  for (let depth = 0; current && depth < 5; depth += 1) {
    if (typeof current.code === "string") {
      return current;
    }

    current = current.cause as PostgresError | undefined;
  }

  return null;
}

/**
 * Turns database constraint violations into 409/400 responses instead of
 * letting them surface as an opaque 500.
 */
export function serverError(error: unknown) {
  const dbError = findPostgresError(error);

  if (dbError?.code === "23505") {
    const message =
      (dbError.constraint && uniqueConstraintMessages[dbError.constraint]) ??
      "This record already exists";

    return conflict(message);
  }

  if (dbError?.code === "23503") {
    return Response.json(
      { error: "A referenced record does not exist" },
      { status: 400 },
    );
  }

  if (dbError?.code === "23502") {
    return Response.json(
      { error: "A required field is missing" },
      { status: 400 },
    );
  }

  console.error(error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
