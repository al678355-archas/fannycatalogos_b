import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { unauthorized } from '../utils/errors.js';

export const AUTH_COOKIE = 'admin_session';
const BCRYPT_ROUNDS = 12;
// Hash ficticio para igualar tiempos de respuesta cuando el usuario no existe
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);

export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

/** Campos públicos de un administrador (nunca incluye passwordHash) */
export const adminPublicSelect = {
  id: true,
  name: true,
  username: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
};

export async function verifyCredentials(username, password) {
  const admin = await prisma.adminUser.findUnique({ where: { username: username.toLowerCase() } });
  const valid = await bcrypt.compare(password, admin?.passwordHash || DUMMY_HASH);
  if (!admin || !valid || !admin.isActive) {
    throw unauthorized('Credenciales incorrectas');
  }
  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  return admin;
}

export function signToken(admin) {
  return jwt.sign({ sub: admin.id, v: admin.tokenVersion }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
}

export function cookieOptions() {
  const decoded = jwt.decode(jwt.sign({}, 'x', { expiresIn: env.jwtExpiresIn }));
  const maxAge = (decoded.exp - decoded.iat) * 1000;
  return {
    httpOnly: true,
    secure: env.isProduction || env.cookieSameSite === 'none',
    sameSite: env.cookieSameSite,
    path: '/',
    maxAge,
  };
}

export async function verifyPassword(adminId, password) {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  return Boolean(admin) && bcrypt.compare(password, admin.passwordHash);
}
