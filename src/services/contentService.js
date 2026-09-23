import { prisma } from '../config/prisma.js';
import { notFound, badRequest } from '../utils/errors.js';
import { serializeImage, ensureImageExists, deleteIfOrphan } from './imageService.js';

export const SECTION_TYPES = ['hero', 'text', 'imageText', 'features', 'cta'];
const ORDER = [{ sortOrder: 'asc' }, { createdAt: 'asc' }];

export function serializeSection(s, { admin = false } = {}) {
  const base = {
    id: s.id,
    type: s.type,
    title: s.title,
    subtitle: s.subtitle,
    body: s.body,
    buttonText: s.buttonText,
    buttonUrl: s.buttonUrl,
    items: Array.isArray(s.items) ? s.items : [],
    image: serializeImage(s.image),
    bgColor: s.bgColor,
    textColor: s.textColor,
    sortOrder: s.sortOrder,
  };
  return admin ? { ...base, visible: s.visible, updatedAt: s.updatedAt } : base;
}

export function listVisibleSections() {
  return prisma.contentSection.findMany({
    where: { visible: true },
    orderBy: ORDER,
    include: { image: true },
  });
}

export function listAllSections() {
  return prisma.contentSection.findMany({ orderBy: ORDER, include: { image: true } });
}

async function getSection(id) {
  const section = await prisma.contentSection.findUnique({ where: { id } });
  if (!section) throw notFound('Sección no encontrada');
  return section;
}

export async function createSection(data) {
  await ensureImageExists(data.imageId);
  const last = await prisma.contentSection.aggregate({ _max: { sortOrder: true } });
  return prisma.contentSection.create({
    data: { ...data, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    include: { image: true },
  });
}

export async function updateSection(id, data) {
  const current = await getSection(id);
  if (data.imageId !== undefined) await ensureImageExists(data.imageId);
  const updated = await prisma.contentSection.update({
    where: { id },
    data,
    include: { image: true },
  });
  if (data.imageId !== undefined && current.imageId && current.imageId !== data.imageId) {
    await deleteIfOrphan(current.imageId);
  }
  return updated;
}

export async function deleteSection(id) {
  const current = await getSection(id);
  await prisma.contentSection.delete({ where: { id } });
  await deleteIfOrphan(current.imageId);
}

export async function reorderSections(ids) {
  const count = await prisma.contentSection.count({ where: { id: { in: ids } } });
  if (count !== ids.length) throw badRequest('La lista contiene secciones inexistentes');
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.contentSection.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );
}
