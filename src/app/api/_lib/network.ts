/**
 * Server-side IP-based office network verification for Attendance check-in/out.
 *
 * The approved office IP(s) live only in server environment variables
 * (`OFFICE_PUBLIC_IP`) and are never sent to the client — only the pass/fail
 * result is. The caller's IP is derived from the incoming request itself and
 * is never accepted from the request body, so the client cannot spoof a
 * "verified" result by lying about its own address.
 *
 * `NextRequest.ip` / `.geo` were removed in Next.js 15 (values now come from
 * the hosting platform). Reading `x-forwarded-for` / `x-real-ip` directly is
 * the portable replacement that doesn't require a platform-specific package
 * (e.g. `@vercel/functions`), which this project does not otherwise depend on.
 *
 * A development-only `x-dev-office-ip` header lets a developer simulate any
 * of the three outcomes locally (see `getDevIpOverride` below); it has no
 * effect outside `NODE_ENV === "development"`.
 */

function parseApprovedIps(raw: string | undefined) {
  return (raw ?? "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
}

/**
 * ---------------------------------------------------------------------------
 * DEV-ONLY test override — never active outside local development.
 *
 * `next dev` on localhost has no reverse proxy, so it never sets
 * `x-forwarded-for`/`x-real-ip`, and office-network verification would always
 * land on "IP unavailable" no matter what. To let a developer exercise the
 * verified / not-verified / unavailable states locally, a request may carry
 * an `x-dev-office-ip` header that stands in for the detected IP.
 *
 * This header is only ever read when `process.env.NODE_ENV === "development"`.
 * `NODE_ENV` is set by the Next.js toolchain itself (`next dev` → development,
 * `next build`/`next start` → production) — it is not something a client or a
 * request can influence. `next build` also statically inlines this check, so
 * the branch below is dead-code-eliminated from production bundles entirely,
 * not just skipped at runtime. A production deployment therefore has no code
 * path that reads this header at all; a client sending it there is a no-op.
 * ---------------------------------------------------------------------------
 */
const DEV_IP_OVERRIDE_HEADER = "x-dev-office-ip";

function getDevIpOverride(request: Request): string | null {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const override = request.headers.get(DEV_IP_OVERRIDE_HEADER)?.trim();

  if (override) {
    // Loud on purpose: this must never be mistaken for a real detection.
    console.warn(
      `[office-network] DEV override active — treating request as coming from "${override}". ` +
        "This header is ignored outside development.",
    );
    return override;
  }

  return null;
}

/** The caller's IP as seen by the server, or null if it can't be determined. */
export function getClientIp(request: Request): string | null {
  const devOverride = getDevIpOverride(request);
  if (devOverride) {
    return devOverride;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();

  return null;
}

export type OfficeNetworkStatus = {
  /** Whether OFFICE_PUBLIC_IP has been set at all. */
  configured: boolean;
  /** True only when configured AND the caller's IP matches an approved one. */
  verified: boolean;
  /** The requester's own IP, safe to show to the requester. */
  currentIp: string | null;
  /** Friendly label for the approved network; never the IP itself. */
  officeName: string;
};

/**
 * Compares the request's IP against OFFICE_PUBLIC_IP (a comma-separated list,
 * so multiple office egress IPs can be approved). Fails closed: missing
 * configuration or an undetectable IP both resolve to "not verified", never
 * to a false "verified".
 */
export function verifyOfficeNetwork(request: Request): OfficeNetworkStatus {
  const approvedIps = parseApprovedIps(process.env.OFFICE_PUBLIC_IP);
  const officeName = process.env.OFFICE_NETWORK_NAME?.trim() || "Office Network";
  const currentIp = getClientIp(request);

  if (approvedIps.length === 0) {
    return { configured: false, verified: false, currentIp, officeName };
  }

  if (!currentIp) {
    return { configured: true, verified: false, currentIp: null, officeName };
  }

  return {
    configured: true,
    verified: approvedIps.includes(currentIp),
    currentIp,
    officeName,
  };
}
