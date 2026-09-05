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

export function serverError(error: unknown) {
  console.error(error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
