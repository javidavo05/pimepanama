import { randomUUID } from "crypto";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

import type { AdminUser } from "@prisma/client";

import { prisma } from "./prisma";

export const SESSION_COOKIE = "pime_admin_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12; // 12 hours

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: string) {
  const session = await prisma.adminSession.create({
    data: {
      userId,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    },
    select: {
      token: true,
      expiresAt: true,
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: session.expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return;

  await prisma.adminSession.deleteMany({
    where: {
      token,
    },
  });

  store.delete(SESSION_COOKIE);
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.adminSession.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) {
    store.delete(SESSION_COOKIE);
    return null;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.adminSession.delete({
      where: { token },
    });
    store.delete(SESSION_COOKIE);
    return null;
  }

  return session.user;
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new Error("Unauthorized");
  }
  return admin;
}

