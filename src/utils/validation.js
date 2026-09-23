import { z } from 'zod';
import { badRequest } from './errors.js';

// Elimina caracteres de control (conserva saltos de línea y tabulaciones)
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export const cleanText = (value) => String(value ?? '').replace(CONTROL_CHARS, '').trim();

export const text = (max, { required = false } = {}) => {
  const base = z.preprocess(
    (v) => (v === null || v === undefined ? '' : cleanText(v)),
    z.string().max(max, `Máximo ${max} caracteres`),
  );
  return required ? base.refine((v) => v.length > 0, 'Campo obligatorio') : base;
};

// URLs permitidas: relativas, anclas, http(s), mailto y tel. Bloquea javascript:, data:, etc.
const SAFE_URL = /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i;
export const isSafeUrl = (value) => value === '' || SAFE_URL.test(value);

export const safeUrl = (max = 300) =>
  text(max).refine(isSafeUrl, 'URL no válida (usa https://, /ruta, #ancla, mailto: o tel:)');

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
export const hexColor = () => z.string().trim().regex(HEX, 'Color hexadecimal no válido');
export const optionalHexColor = () =>
  z.string().trim().refine((v) => v === '' || HEX.test(v), 'Color hexadecimal no válido');

export const id = () => z.string().trim().min(1).max(40);
export const nullableId = () =>
  z.preprocess((v) => (v === '' || v === undefined ? null : v), id().nullable());

/**
 * Normaliza un precio a string con 2 decimales ("1250.00").
 * Acepta "1,250.00", "$1250", 1250.5. Devuelve null si no es válido.
 */
export function parsePrice(input) {
  if (input === null || input === undefined) return null;
  const raw = String(input).replace(/[$\s,]/g, '');
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(raw)) return null;
  const [int, dec = ''] = raw.split('.');
  return `${BigInt(int).toString()}.${dec.padEnd(2, '0')}`;
}

export const price = () =>
  z.preprocess(
    (v) => parsePrice(v) ?? v,
    z
      .string({ required_error: 'El precio es obligatorio', invalid_type_error: 'Precio no válido' })
      .regex(/^\d{1,10}\.\d{2}$/, 'Precio no válido (ej. 1250 o 1250.00, máximo 2 decimales)'),
  );

export const linkItem = z.object({
  label: text(60, { required: true }),
  url: safeUrl(),
  visible: z.boolean().default(true),
});

export const socialItem = z.object({
  network: text(30, { required: true }),
  url: safeUrl(),
  visible: z.boolean().default(true),
});

export const boolFromForm = () =>
  z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean());

/** Valida y devuelve datos limpios o lanza un 400 con el detalle por campo. */
export function parseOrThrow(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    throw badRequest(details[0]?.message || 'Datos no válidos', details);
  }
  return result.data;
}
