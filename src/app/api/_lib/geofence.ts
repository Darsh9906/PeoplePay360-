/**
 * Office geofence check for attendance check-in.
 *
 * The approved office coordinates live only in server environment variables
 * (`OFFICE_LATITUDE`, `OFFICE_LONGITUDE`, `OFFICE_RADIUS_METERS`) and are never
 * sent to the client — only the pass/fail result and the caller's own distance.
 *
 * IMPORTANT, and different from the IP check: these coordinates are *supplied
 * by the browser* (`navigator.geolocation`), so unlike the request IP they can
 * be faked — browser devtools can override the sensor outright. This check
 * therefore raises the bar but is not proof of presence. It is deliberately
 * paired with the IP check in the route, which the client cannot influence.
 */

const EARTH_RADIUS_METRES = 6_371_000;

export type OfficeLocationStatus = {
  /** Whether the office coordinates have been configured at all. */
  configured: boolean;
  /** True only when configured, coordinates were supplied, and inside radius. */
  verified: boolean;
  /** Metres from the office, or null when it could not be computed. */
  distanceMeters: number | null;
  /** The allowed radius, safe to show so an employee knows how close to get. */
  radiusMeters: number | null;
  /** Why it failed, for a message the employee can act on. */
  reason:
    | "ok"
    | "not-configured"
    | "no-coordinates"
    | "outside-radius"
    | "invalid-coordinates";
};

function parseNumber(raw: string | undefined) {
  if (raw === undefined || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** Great-circle distance in metres. */
export function distanceInMeters(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Compares client-reported coordinates against the configured office point.
 * Fails closed: missing configuration, missing or invalid coordinates, and
 * anything outside the radius all resolve to "not verified".
 */
export function verifyOfficeLocation(
  latitude: unknown,
  longitude: unknown,
): OfficeLocationStatus {
  const officeLat = parseNumber(process.env.OFFICE_LATITUDE);
  const officeLng = parseNumber(process.env.OFFICE_LONGITUDE);
  const radiusMeters = parseNumber(process.env.OFFICE_RADIUS_METERS) ?? 200;

  if (officeLat === null || officeLng === null) {
    return {
      configured: false,
      verified: false,
      distanceMeters: null,
      radiusMeters: null,
      reason: "not-configured",
    };
  }

  if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
    return {
      configured: true,
      verified: false,
      distanceMeters: null,
      radiusMeters,
      reason: "no-coordinates",
    };
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  // Reject anything outside real coordinate ranges rather than trusting it.
  const valid =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180;

  if (!valid) {
    return {
      configured: true,
      verified: false,
      distanceMeters: null,
      radiusMeters,
      reason: "invalid-coordinates",
    };
  }

  const distanceMeters = Math.round(distanceInMeters(lat, lng, officeLat, officeLng) * 10) / 10;

  return {
    configured: true,
    verified: distanceMeters <= radiusMeters,
    distanceMeters,
    radiusMeters,
    reason: distanceMeters <= radiusMeters ? "ok" : "outside-radius",
  };
}
