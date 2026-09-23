import { parseOrThrow } from '../utils/validation.js';
import { siteSchema, settingsSchema, headerSchema, footerSchema } from '../validators/schemas.js';
import * as site from '../services/siteService.js';
import { listVisibleSections, serializeSection } from '../services/contentService.js';

/** Datos públicos necesarios para renderizar el sitio en una sola petición */
export async function getPublicSite(_req, res) {
  const [settings, header, footer, sections] = await Promise.all([
    site.getSiteSettings(),
    site.getHeader(),
    site.getFooter(),
    listVisibleSections(),
  ]);
  res.set('Cache-Control', 'no-cache');
  res.json({
    site: site.serializeSite(settings),
    header: site.serializeHeader(header),
    footer: site.serializeFooter(footer),
    sections: sections.map((s) => serializeSection(s)),
  });
}

/** Apariencia: colores, logo y favicon */
export async function updateSite(req, res) {
  const data = parseOrThrow(siteSchema, req.body);
  const updated = await site.updateSiteSettings(data);
  res.json({ site: site.serializeSiteAdmin(updated) });
}

export async function getSettings(_req, res) {
  res.json({ site: site.serializeSiteAdmin(await site.getSiteSettings()) });
}

export async function updateSettings(req, res) {
  const data = parseOrThrow(settingsSchema, req.body);
  const updated = await site.updateSiteSettings(data);
  res.json({ site: site.serializeSiteAdmin(updated) });
}

export async function getHeader(_req, res) {
  res.json({ header: site.serializeHeader(await site.getHeader()) });
}

export async function updateHeader(req, res) {
  const data = parseOrThrow(headerSchema, req.body);
  res.json({ header: site.serializeHeader(await site.updateHeader(data)) });
}

export async function getFooter(_req, res) {
  res.json({ footer: site.serializeFooter(await site.getFooter()) });
}

export async function updateFooter(req, res) {
  const data = parseOrThrow(footerSchema, req.body);
  res.json({ footer: site.serializeFooter(await site.updateFooter(data)) });
}
