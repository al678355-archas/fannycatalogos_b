import { prisma } from '../config/prisma.js';
import { AUTH_COOKIE, verifyToken, adminPublicSelect } from '../services/authService.js';
import { unauthorized } from '../utils/errors.js';

/** Exige una sesión de administrador válida y activa. Expone req.admin */
export async function requireAuth(req, _res, next) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return next(unauthorized());

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return next(unauthorized('Sesión expirada o no válida'));
  }

  const admin = await prisma.adminUser.findUnique({
    where: { id: payload.sub },
    select: { ...adminPublicSelect, tokenVersion: true },
  });
  if (!admin || !admin.isActive || admin.tokenVersion !== payload.v) {
    return next(unauthorized('Sesión no válida'));
  }

  const { tokenVersion: _ignored, ...publicAdmin } = admin;
  req.admin = publicAdmin;
  next();
}
