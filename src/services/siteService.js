import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { DEFAULT_THEME, resolveTheme } from '../utils/theme.js';
import { serializeImage, ensureImageExists, deleteIfOrphan } from './imageService.js';

const SINGLETON_ID = 1;
const withImages = { logo: true, favicon: true, ogImage: true };

// Valores por defecto de las filas únicas (se crean automáticamente la primera vez)
export const DEFAULTS = {
  site: {
    siteName: 'Mi Marca',
    seoTitle: 'Mi Marca · Catálogo',
    seoDescription: 'Descubre nuestro catálogo de productos.',
    theme: DEFAULT_THEME,
    catalogTitle: 'Catálogo',
    catalogSubtitle: 'Explora nuestros productos disponibles.',
  },
  header: {
    brandText: 'Mi Marca',
    links: [{ label: 'Inicio', url: '/', visible: true }],
    ctaText: 'Contáctanos',
    ctaUrl: '/contacto',
  },
  footer: {
    text: 'Gracias por visitarnos.',
    copyright: `© ${new Date().getFullYear()} Mi Marca. Todos los derechos reservados.`,
    links: [
      { label: 'Inicio', url: '/', visible: true },
      { label: 'Catálogo', url: '/catalogo', visible: true },
      { label: 'Contacto', url: '/contacto', visible: true },
    ],
    socials: [],
  },
};

/* ─────────────── Site settings ─────────────── */

export async function getSiteSettings() {
  return prisma.siteSettings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID, ...DEFAULTS.site },
    include: withImages,
  });
}

export function catalogUrlFrom(settings) {
  return settings.catalogUrl || `${env.publicFrontendUrl}/catalogo`;
}

/** Vista pública (sin campos internos) */
export function serializeSite(s) {
  return {
    siteName: s.siteName,
    seoTitle: s.seoTitle,
    seoDescription: s.seoDescription,
    theme: resolveTheme(s.theme),
    currency: s.currency,
    locale: s.locale,
    catalogTitle: s.catalogTitle,
    catalogSubtitle: s.catalogSubtitle,
    catalogUrl: catalogUrlFrom(s),
    contact: {
      title: s.contactTitle,
      subtitle: s.contactSubtitle,
      text: s.contactText,
      whatsapp: s.contactWhatsapp,
      whatsappMessage: s.contactWhatsappMessage,
      hours: s.contactHours,
      mapUrl: s.contactMapUrl,
    },
    logo: serializeImage(s.logo),
    favicon: serializeImage(s.favicon),
    ogImage: serializeImage(s.ogImage),
    updatedAt: s.updatedAt,
  };
}

/** Vista administrativa (incluye campos editables) */
export function serializeSiteAdmin(s) {
  return {
    ...serializeSite(s),
    catalogUrlOverride: s.catalogUrl,
    pdfFooterText: s.pdfFooterText,
  };
}

const IMAGE_FIELDS = ['logoId', 'faviconId', 'ogImageId'];

export async function updateSiteSettings(data) {
  const current = await getSiteSettings();
  for (const field of IMAGE_FIELDS) {
    if (data[field] !== undefined) await ensureImageExists(data[field]);
  }
  if (data.theme) data.theme = { ...resolveTheme(current.theme), ...data.theme };

  const updated = await prisma.siteSettings.update({
    where: { id: SINGLETON_ID },
    data,
    include: withImages,
  });

  // Limpia imágenes reemplazadas que ya no se usan
  for (const field of IMAGE_FIELDS) {
    if (data[field] !== undefined && current[field] && current[field] !== data[field]) {
      await deleteIfOrphan(current[field]);
    }
  }
  return updated;
}

/* ─────────────── Header ─────────────── */

export async function getHeader() {
  return prisma.headerSettings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID, ...DEFAULTS.header },
  });
}

export function serializeHeader(h) {
  const { id: _id, ...rest } = h;
  return rest;
}

export async function updateHeader(data) {
  await getHeader();
  return prisma.headerSettings.update({ where: { id: SINGLETON_ID }, data });
}

/* ─────────────── Footer ─────────────── */

export async function getFooter() {
  return prisma.footerSettings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID, ...DEFAULTS.footer },
    include: { logo: true },
  });
}

export function serializeFooter(f) {
  const { id: _id, logo, ...rest } = f;
  return { ...rest, logo: serializeImage(logo) };
}

export async function updateFooter(data) {
  const current = await getFooter();
  if (data.logoId !== undefined) await ensureImageExists(data.logoId);
  const updated = await prisma.footerSettings.update({
    where: { id: SINGLETON_ID },
    data,
    include: { logo: true },
  });
  if (data.logoId !== undefined && current.logoId && current.logoId !== data.logoId) {
    await deleteIfOrphan(current.logoId);
  }
  return updated;
}
