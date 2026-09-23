import { prisma } from '../config/prisma.js';
import { parseOrThrow } from '../utils/validation.js';
import { createAdminSchema, updateAdminSchema, resetPasswordSchema } from '../validators/schemas.js';
import { hashPassword, adminPublicSelect } from '../services/authService.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';

async function findTarget(id) {
  const target = await prisma.adminUser.findUnique({ where: { id } });
  if (!target) throw notFound('Administrador no encontrado');
  return target;
}

async function assertUsernameAvailable(username, exceptId) {
  const exists = await prisma.adminUser.findUnique({ where: { username }, select: { id: true } });
  if (exists && exists.id !== exceptId) throw conflict('Ya existe un administrador con ese usuario');
}

/** Impide quedarse sin administradores activos */
async function assertNotLastActive(target) {
  if (!target.isActive) return;
  const activeCount = await prisma.adminUser.count({ where: { isActive: true } });
  if (activeCount <= 1) throw badRequest('Debe existir al menos un administrador activo');
}

export async function listAdmins(_req, res) {
  const admins = await prisma.adminUser.findMany({
    select: adminPublicSelect,
    orderBy: { createdAt: 'asc' },
  });
  res.json({ admins });
}

export async function createAdmin(req, res) {
  const data = parseOrThrow(createAdminSchema, req.body);
  await assertUsernameAvailable(data.username);
  const admin = await prisma.adminUser.create({
    data: { name: data.name, username: data.username, passwordHash: await hashPassword(data.password) },
    select: adminPublicSelect,
  });
  res.status(201).json({ admin });
}

/** Edita nombre, usuario y/o estado activo */
export async function updateAdmin(req, res) {
  const data = parseOrThrow(updateAdminSchema, req.body);
  const target = await findTarget(req.params.id);

  if (data.username !== undefined) await assertUsernameAvailable(data.username, target.id);

  if (data.isActive === false) {
    if (target.id === req.admin.id) throw badRequest('No puedes desactivar tu propia cuenta');
    await assertNotLastActive(target);
  }

  const admin = await prisma.adminUser.update({
    where: { id: target.id },
    data: {
      ...data,
      // Desactivar cierra las sesiones abiertas de ese administrador
      ...(data.isActive === false ? { tokenVersion: { increment: 1 } } : {}),
    },
    select: adminPublicSelect,
  });
  res.json({ admin });
}

/** Restablece la contraseña de OTRO administrador (la propia se cambia en /auth/password) */
export async function resetPassword(req, res) {
  const { newPassword } = parseOrThrow(resetPasswordSchema, req.body);
  const target = await findTarget(req.params.id);
  if (target.id === req.admin.id) {
    throw badRequest('Para tu propia cuenta usa "Cambiar mi contraseña"');
  }
  await prisma.adminUser.update({
    where: { id: target.id },
    // Cierra las sesiones abiertas del administrador afectado
    data: { passwordHash: await hashPassword(newPassword), tokenVersion: { increment: 1 } },
  });
  res.json({ ok: true });
}

export async function deleteAdmin(req, res) {
  // Protección contra borrados accidentales: el cliente debe enviar la palabra de confirmación
  if (req.query.confirm !== 'ELIMINAR') {
    throw badRequest('Confirmación requerida para eliminar el administrador');
  }
  const target = await findTarget(req.params.id);
  if (target.id === req.admin.id) throw badRequest('No puedes eliminar tu propia cuenta');
  await assertNotLastActive(target);
  await prisma.adminUser.delete({ where: { id: target.id } });
  res.json({ ok: true });
}
