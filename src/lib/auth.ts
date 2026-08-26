import { cookies } from 'next/headers';
import { randomBytes, createHash, timingSafeEqual, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/services/auditService';

const scrypt = promisify(scryptCallback);

export const AUTH_COOKIE_NAME = 'rpg_campaign_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const PASSWORD_KEY_LENGTH = 64;

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, expectedHex] = storedHash.split(':');
  if (!salt || !expectedHex) return false;
  const actual = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  const expected = Buffer.from(expectedHex, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function publicUser(user: PublicUser): PublicUser {
  return user;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  await prisma.authSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS)
    }
  });
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000
  });
  return token;
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    const session = await prisma.authSession.findUnique({ where: { tokenHash: hashToken(token) }, select: { userId: true } });
    await prisma.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
    if (session) void recordAudit({ actorId: session.userId, action: 'LOGOUT', entityType: 'User', entityId: session.userId }).catch(() => undefined);
  }
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, name: true, email: true, createdAt: true } } }
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.authSession.delete({ where: { id: session.id } });
    cookieStore.delete(AUTH_COOKIE_NAME);
    return null;
  }

  if (session.lastSeenAt.getTime() < Date.now() - 1000 * 60 * 10) {
    await prisma.authSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  }
  return publicUser(session.user);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    const error = new Error('Autenticação necessária.') as Error & { status: number };
    error.status = 401;
    throw error;
  }
  return user;
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
}

export async function registerUser(input: { name: string; email: string; password: string }) {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { name: input.name.trim(), email, passwordHash },
    select: { id: true, name: true, email: true, createdAt: true }
  });
  await createSession(user.id);
  void recordAudit({ actorId: user.id, action: 'REGISTER', entityType: 'User', entityId: user.id, metadata: { email: user.email } }).catch(() => undefined);
  return user;
}

export async function loginUser(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    const error = new Error('E-mail ou senha inválidos.') as Error & { status: number };
    error.status = 401;
    throw error;
  }
  await createSession(user.id);
  void recordAudit({ actorId: user.id, action: 'LOGIN', entityType: 'User', entityId: user.id, metadata: { email: user.email } }).catch(() => undefined);
  return publicUser(user);
}

export function normalizeUserEmail(email: string) {
  return normalizeEmail(email);
}
