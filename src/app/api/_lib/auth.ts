import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

export const sessionCookieName = "peoplepay360_session";

const iterations = 120_000;
const keyLength = 64;
const digest = "sha512";

export function createToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, iterations, keyLength, digest).toString(
    "hex",
  );

  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) {
    return false;
  }

  const [method, iterationValue, salt, stored] = storedHash.split("$");

  if (method !== "pbkdf2" || !iterationValue || !salt || !stored) {
    return false;
  }

  const computed = pbkdf2Sync(
    password,
    salt,
    Number(iterationValue),
    keyLength,
    digest,
  );
  const storedBuffer = Buffer.from(stored, "hex");

  if (storedBuffer.length !== computed.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, computed);
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.tokenHash, hashToken(token)),
    with: {
      user: true,
    },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }

  return session.user;
}

export async function createUserSession(userId: string) {
  const token = createToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, userId));

  return { token, expiresAt };
}

export function sessionCookie(token: string, expiresAt: Date) {
  return `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}`;
}

export function clearSessionCookie() {
  return `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
