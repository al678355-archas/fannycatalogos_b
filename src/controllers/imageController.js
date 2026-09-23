import { prisma } from '../config/prisma.js';
import { parseOrThrow } from '../utils/validation.js';
import { imageMetaSchema } from '../validators/schemas.js';
import * as images from '../services/imageService.js';

export async function list(_req, res) {
  res.json({ images: await images.listImages() });
}

export async function upload(req, res) {
  const { alt } = parseOrThrow(imageMetaSchema, { alt: req.body?.alt });
  const asset = await images.createImage(req.file, alt);
  res.status(201).json({ image: images.serializeImage(asset) });
}

export async function updateMeta(req, res) {
  const { alt } = parseOrThrow(imageMetaSchema, req.body);
  const asset = await prisma.imageAsset.update({ where: { id: req.params.id }, data: { alt } });
  res.json({ image: images.serializeImage(asset) });
}

export async function remove(req, res) {
  await images.deleteImage(req.params.id);
  res.json({ ok: true });
}
