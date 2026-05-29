import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { createCookieSessionStorage, redirect } from "react-router";
import type { StaffUser } from "@prisma/client";
import prisma from "../db.server";

// --- Password hashing (scrypt, no external dependency) ---
// Format: "<saltHex>:<hashHex>". timingSafeEqual guards against timing attacks.

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const hash = Buffer.from(hashHex, "hex");
  const test = scryptSync(password, Buffer.from(saltHex, "hex"), 64);
  return hash.length === test.length && timingSafeEqual(hash, test);
}

// --- Cookie session ---

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__karinex_staff",
    httpOnly: true,
    path: "/staff",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    secrets: [
      process.env.STAFF_SESSION_SECRET ||
        process.env.SHOPIFY_API_SECRET ||
        "karinex-staff-dev-secret",
    ],
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
});

const USER_ID_KEY = "staffUserId";

// Seed the first admin from env (STAFF_ADMIN_EMAIL + STAFF_ADMIN_PASSWORD) the
// first time anyone logs in, so the portal works without a manual DB insert.
// Only runs while the table is empty; changing the env later won't re-seed.
export async function ensureSeedAdmin(): Promise<void> {
  const email = process.env.STAFF_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.STAFF_ADMIN_PASSWORD;
  if (!email || !password) return;
  const count = await prisma.staffUser.count();
  if (count > 0) return;
  await prisma.staffUser.create({
    data: { email, passwordHash: hashPassword(password) },
  });
}

export async function verifyStaffCredentials(
  email: string,
  password: string,
): Promise<StaffUser | null> {
  const user = await prisma.staffUser.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) {
    // Equalise timing so a missing account isn't distinguishable from a wrong
    // password (mitigates user enumeration).
    verifyPassword(password, hashPassword("decoy"));
    return null;
  }
  if (!verifyPassword(password, user.passwordHash)) return null;
  await prisma.staffUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  return user;
}

export async function createStaffSession(
  userId: string,
  redirectTo: string,
): Promise<Response> {
  const session = await sessionStorage.getSession();
  session.set(USER_ID_KEY, userId);
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
  });
}

export async function getStaffUser(request: Request): Promise<StaffUser | null> {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const userId = session.get(USER_ID_KEY);
  if (!userId || typeof userId !== "string") return null;
  return prisma.staffUser.findUnique({ where: { id: userId } });
}

export async function requireStaffUser(request: Request): Promise<StaffUser> {
  const user = await getStaffUser(request);
  if (!user) {
    throw redirect("/staff/login");
  }
  return user;
}

export function isAdmin(user: StaffUser): boolean {
  return user.role === "ADMIN";
}

// Guard mutating actions: only ADMIN staff may proceed; VIEWERs get a 403.
export async function requireStaffAdmin(request: Request): Promise<StaffUser> {
  const user = await requireStaffUser(request);
  if (!isAdmin(user)) {
    throw new Response("Nur Administratoren dürfen Änderungen vornehmen.", {
      status: 403,
    });
  }
  return user;
}

export async function destroyStaffSession(request: Request): Promise<Response> {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  return redirect("/staff/login", {
    headers: { "Set-Cookie": await sessionStorage.destroySession(session) },
  });
}
