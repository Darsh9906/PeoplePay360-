export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const errorMsg =
      payload?.error ||
      payload?.message ||
      (Array.isArray(payload?.errors) ? payload.errors.map((e: { message?: string } | string) => (typeof e === "object" && e?.message ? e.message : String(e))).join(", ") : null) ||
      `Request failed with status ${response.status}`

    throw new Error(errorMsg)
  }

  return (payload?.data !== undefined ? payload.data : payload) as T
}
