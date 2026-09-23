import { parseOrThrow } from '../utils/validation.js';
import {
  createSectionSchema,
  updateSectionSchema,
  reorderSchema,
} from '../validators/schemas.js';
import * as content from '../services/contentService.js';

const toAdmin = (s) => content.serializeSection(s, { admin: true });

export async function listPublic(_req, res) {
  const sections = await content.listVisibleSections();
  res.json({ sections: sections.map((s) => content.serializeSection(s)) });
}

export async function listAdmin(_req, res) {
  const sections = await content.listAllSections();
  res.json({ sections: sections.map(toAdmin) });
}

export async function create(req, res) {
  const data = parseOrThrow(createSectionSchema, req.body);
  res.status(201).json({ section: toAdmin(await content.createSection(data)) });
}

export async function update(req, res) {
  const data = parseOrThrow(updateSectionSchema, req.body);
  res.json({ section: toAdmin(await content.updateSection(req.params.id, data)) });
}

export async function remove(req, res) {
  await content.deleteSection(req.params.id);
  res.json({ ok: true });
}

export async function reorder(req, res) {
  const { ids } = parseOrThrow(reorderSchema, req.body);
  await content.reorderSections(ids);
  res.json({ ok: true });
}
