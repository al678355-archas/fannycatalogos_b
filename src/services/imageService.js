import crypto from 'node:crypto';
import sharp from 'sharp';
import { prisma } from '../config/prisma.js';
import { storage, providerFor, publicUrl } from './storage/index.js';
import { badRequest, notFound } from '../utils/errors.js';

const MAX_DIMENSION = 1600;

/**
 * Valida el contenido real del archivo (no sólo el mimetype declarado),
 * limita dimensiones y normaliza a JPEG/PNG (compatibles con web y PDF).
 */
async function processImage(buffer) {
  let image;
  let meta;
  try {
    image = sharp(buffer, { failOn: 'error' }).rotate();
    meta = await image.metadata();
  } catch {
    throw badRequest('El archivo no es una imagen válida');
  }
  if (!['jpeg', 'png', 'webp'].includes(meta.format)) {
    throw badRequest('Formato no permitido. Usa JPG, PNG o WEBP');
  }
  const resized = image.resize({
    width: MAX_DIMENSION,
    height: MAX_DIMENSION,
    fit: 'inside',
    withoutEnlargement: true,
  });
  const keepAlpha = meta.hasAlpha;
  const { data, info } = keepAlpha
    ? await resized.png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true })
    : await resized.jpeg({ quality: 82, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  return {
    buffer: data,
    width: info.width,
    height: info.height,
    ext: keepAlpha ? 'png' : 'jpg',
    mimeType: keepAlpha ? 'image/png' : 'image/jpeg',
  };
}

export function serializeImage(asset) {
  if (!asset) return null;
  return {
    id: asset.id,
    url: publicUrl(asset.url),
    alt: asset.alt || '',
    width: asset.width,
    height: asset.height,
    size: asset.size,
    mimeType: asset.mimeType,
    createdAt: asset.createdAt,
  };
}

export async function createImage(file, alt = '') {
  if (!file) throw badRequest('No se recibió ninguna imagen');
  const processed = await processImage(file.buffer);
  const key = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${processed.ext}`;
  const saved = await storage.save({ buffer: processed.buffer, key, mimeType: processed.mimeType });
  const asset = await prisma.imageAsset.create({
    data: {
      url: saved.url,
      storageKey: saved.storageKey,
      provider: storage.name,
      mimeType: processed.mimeType,
      size: processed.buffer.length,
      width: processed.width,
      height: processed.height,
      alt: alt || null,
    },
  });
  return asset;
}

export async function listImages() {
  const assets = await prisma.imageAsset.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: usageSelect } },
  });
  return assets.map((a) => ({ ...serializeImage(a), usage: totalUsage(a._count) }));
}

const usageSelect = {
  products: true,
  sections: true,
  siteLogos: true,
  siteFavicons: true,
  siteOgImages: true,
  footerLogos: true,
};

const totalUsage = (count) => Object.values(count).reduce((sum, n) => sum + n, 0);

export async function ensureImageExists(id) {
  if (!id) return;
  const exists = await prisma.imageAsset.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw badRequest('La imagen seleccionada no existe');
}

/** Elimina el asset (registro + archivo). Las referencias quedan en null (onDelete: SetNull). */
export async function deleteImage(id) {
  const asset = await prisma.imageAsset.findUnique({ where: { id } });
  if (!asset) throw notFound('Imagen no encontrada');
  await prisma.imageAsset.delete({ where: { id } });
  try {
    await providerFor(asset).remove(asset.storageKey);
  } catch (err) {
    console.error('[storage] No se pudo borrar el archivo', asset.storageKey, err.message);
  }
}

/** Borra la imagen si ya nadie la usa (tras reemplazar o quitar la imagen de un producto, logo, etc.) */
export async function deleteIfOrphan(id) {
  if (!id) return;
  const asset = await prisma.imageAsset.findUnique({
    where: { id },
    include: { _count: { select: usageSelect } },
  });
  if (asset && totalUsage(asset._count) === 0) await deleteImage(id);
}

export async function readImageBuffer(asset) {
  return providerFor(asset).read(asset);
}
