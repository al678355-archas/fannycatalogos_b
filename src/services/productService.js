import { prisma } from '../config/prisma.js';
import { notFound, badRequest } from '../utils/errors.js';
import { serializeImage, ensureImageExists, deleteIfOrphan } from './imageService.js';

const ORDER = [{ sortOrder: 'asc' }, { createdAt: 'asc' }];

export function serializeProduct(p, { admin = false } = {}) {
  const base = {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price.toFixed(2), // Decimal -> "1250.00" (sin pérdida de precisión)
    image: serializeImage(p.image),
    sortOrder: p.sortOrder,
  };
  if (!admin) return base;
  return { ...base, isActive: p.isActive, createdAt: p.createdAt, updatedAt: p.updatedAt };
}

export function listActiveProducts() {
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: ORDER,
    include: { image: true },
  });
}

export function listAllProducts() {
  return prisma.product.findMany({ orderBy: ORDER, include: { image: true } });
}

export async function getProduct(id, { onlyActive = false } = {}) {
  const product = await prisma.product.findUnique({ where: { id }, include: { image: true } });
  if (!product || (onlyActive && !product.isActive)) throw notFound('Producto no encontrado');
  return product;
}

export async function createProduct(data) {
  await ensureImageExists(data.imageId);
  if (data.sortOrder === undefined) {
    const last = await prisma.product.aggregate({ _max: { sortOrder: true } });
    data.sortOrder = (last._max.sortOrder ?? -1) + 1;
  }
  return prisma.product.create({ data, include: { image: true } });
}

export async function updateProduct(id, data) {
  const current = await getProduct(id);
  if (data.imageId !== undefined) await ensureImageExists(data.imageId);
  const updated = await prisma.product.update({ where: { id }, data, include: { image: true } });
  if (data.imageId !== undefined && current.imageId && current.imageId !== data.imageId) {
    await deleteIfOrphan(current.imageId);
  }
  return updated;
}

export async function deleteProduct(id) {
  const current = await getProduct(id);
  await prisma.product.delete({ where: { id } });
  await deleteIfOrphan(current.imageId);
}

/** Recibe los IDs en el nuevo orden y reasigna sortOrder consecutivo */
export async function reorderProducts(ids) {
  const count = await prisma.product.count({ where: { id: { in: ids } } });
  if (count !== ids.length) throw badRequest('La lista contiene productos inexistentes');
  await prisma.$transaction(
    ids.map((id, index) => prisma.product.update({ where: { id }, data: { sortOrder: index } })),
  );
}

export async function productStats() {
  const [total, active, lastUpdated] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
  ]);
  return { total, active, inactive: total - active, lastUpdatedAt: lastUpdated?.updatedAt ?? null };
}
