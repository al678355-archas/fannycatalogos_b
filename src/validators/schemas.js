import { z } from 'zod';
import {
  text,
  safeUrl,
  hexColor,
  optionalHexColor,
  price,
  nullableId,
  id,
  linkItem,
  socialItem,
} from '../utils/validation.js';
import { themeSchema } from '../utils/theme.js';
import { SECTION_TYPES } from '../services/contentService.js';

/* ─── Auth / administradores ─── */

// Usuario de acceso: nombre de usuario o email (se guarda en minúsculas)
export const USERNAME_PATTERN = /^[a-z0-9._@+-]{3,160}$/;
const username = () =>
  z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
    z
      .string({ required_error: 'El usuario es obligatorio' })
      .regex(USERNAME_PATTERN, 'Usuario no válido: 3 o más caracteres (letras, números, . _ - @)'),
  );

const password = () =>
  z
    .string({ required_error: 'La contraseña es obligatoria' })
    .min(10, 'La contraseña debe tener al menos 10 caracteres')
    .max(128, 'La contraseña es demasiado larga');

export const loginSchema = z.object({
  username: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
    z.string({ required_error: 'El usuario es obligatorio' }).min(1, 'El usuario es obligatorio').max(160),
  ),
  password: z.string({ required_error: 'La contraseña es obligatoria' }).min(1).max(128),
});

export const createAdminSchema = z.object({
  name: text(120, { required: true }),
  username: username(),
  password: password(),
});

export const updateAdminSchema = z
  .object({
    name: text(120, { required: true }),
    username: username(),
    isActive: z.boolean(),
  })
  .partial();

export const resetPasswordSchema = z.object({
  newPassword: password(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Ingresa tu contraseña actual').max(128),
  newPassword: password(),
});

/* ─── Productos ─── */

const productFields = {
  name: text(150, { required: true }),
  description: text(2000),
  category: text(80),
  price: price(),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(100000),
  imageId: nullableId(),
};

export const createProductSchema = z.object(productFields).partial({
  description: true,
  category: true,
  isActive: true,
  sortOrder: true,
  imageId: true,
});

export const updateProductSchema = z.object(productFields).partial();

export const reorderSchema = z.object({
  ids: z.array(id()).min(1).max(1000),
});

/* ─── Sitio / apariencia / SEO ─── */

export const siteSchema = z
  .object({
    theme: themeSchema,
    logoId: nullableId(),
    faviconId: nullableId(),
  })
  .partial();

export const settingsSchema = z
  .object({
    siteName: text(120, { required: true }),
    seoTitle: text(120, { required: true }),
    seoDescription: text(300),
    ogImageId: nullableId(),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Código de moneda de 3 letras (ej. MXN, USD)'),
    locale: z
      .string()
      .trim()
      .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Locale no válido (ej. es-MX)'),
    catalogTitle: text(120, { required: true }),
    catalogSubtitle: text(300),
    catalogUrl: text(300).refine(
      (v) => v === '' || /^https?:\/\//i.test(v),
      'La URL del catálogo debe empezar con https://',
    ),
    pdfFooterText: text(200),
    // Página de contacto
    contactTitle: text(120, { required: true }),
    contactSubtitle: text(300),
    contactText: text(2000),
    contactWhatsapp: z.preprocess(
      (v) => (typeof v === 'string' ? v.replace(/[\s()+-]/g, '') : v),
      z.string().regex(/^(\d{8,15})?$/, 'WhatsApp: número con lada internacional, sólo dígitos (ej. 5215512345678)'),
    ),
    contactWhatsappMessage: text(300),
    contactHours: text(500),
    contactMapUrl: text(500).refine(
      (v) => v === '' || /^https:\/\//i.test(v),
      'El enlace del mapa debe empezar con https://',
    ),
  })
  .partial();

export const headerSchema = z
  .object({
    brandText: text(80),
    tagline: text(120),
    showLogo: z.boolean(),
    showBrand: z.boolean(),
    catalogLabel: text(40, { required: true }),
    links: z.array(linkItem).max(8),
    ctaText: text(40),
    ctaUrl: safeUrl(),
    showCta: z.boolean(),
    bgColor: hexColor(),
    textColor: hexColor(),
    sticky: z.boolean(),
    showAdminLink: z.boolean(),
  })
  .partial();

export const footerSchema = z
  .object({
    text: text(500),
    copyright: text(160),
    email: text(160).refine(
      (v) => v === '' || z.string().email().safeParse(v).success,
      'Email no válido',
    ),
    phone: text(40),
    address: text(200),
    links: z.array(linkItem).max(12),
    socials: z.array(socialItem).max(10),
    bgColor: hexColor(),
    textColor: hexColor(),
    showLogo: z.boolean(),
    showContact: z.boolean(),
    showLinks: z.boolean(),
    showSocials: z.boolean(),
    logoId: nullableId(),
  })
  .partial();

/* ─── Contenido ─── */

const sectionFields = {
  type: z.enum(SECTION_TYPES, { errorMap: () => ({ message: 'Tipo de sección no válido' }) }),
  title: text(200),
  subtitle: text(300),
  body: text(5000),
  buttonText: text(60),
  buttonUrl: safeUrl(),
  items: z
    .array(z.object({ title: text(120), text: text(500) }))
    .max(12),
  imageId: nullableId(),
  bgColor: optionalHexColor(),
  textColor: optionalHexColor(),
  visible: z.boolean(),
};

export const createSectionSchema = z.object(sectionFields).partial().required({ type: true });
export const updateSectionSchema = z.object(sectionFields).partial();

export const imageMetaSchema = z.object({ alt: text(200) });
