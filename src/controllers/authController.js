import { prisma } from '../config/prisma.js';
import { parseOrThrow } from '../utils/validation.js';
import { loginSchema, changePasswordSchema } from '../validators/schemas.js';
import {
  AUTH_COOKIE,
  verifyCredentials,
  signToken,
  cookieOptions,
  verifyPassword,
  hashPassword,
  adminPublicSelect,
} from '../services/authService.js';
import { badRequest } from '../utils/errors.js';

export async function login(req, res) {
  const { username, password } = parseOrThrow(loginSchema, req.body);
  const admin = await verifyCredentials(username, password);
  res.cookie(AUTH_COOKIE, signToken(admin), cookieOptions());
  res.json({ admin: { id: admin.id, name: admin.name, username: admin.username } });
}

export function logout(_req, res) {
  const { maxAge: _maxAge, ...options } = cookieOptions();
  res.clearCookie(AUTH_COOKIE, options);
  res.json({ ok: true });
}

export function me(req, res) {
  res.json({ admin: req.admin });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = parseOrThrow(changePasswordSchema, req.body);
  if (!(await verifyPassword(req.admin.id, currentPassword))) {
    throw badRequest('La contraseña actual no es correcta');
  }
  // Incrementar tokenVersion invalida otras sesiones abiertas; se emite una cookie nueva
  const admin = await prisma.adminUser.update({
    where: { id: req.admin.id },
    data: { passwordHash: await hashPassword(newPassword), tokenVersion: { increment: 1 } },
    select: { ...adminPublicSelect, tokenVersion: true },
  });
  res.cookie(AUTH_COOKIE, signToken(admin), cookieOptions());
  res.json({ ok: true });
}
