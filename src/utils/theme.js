import { z } from 'zod';
import { hexColor } from './validation.js';

// Paleta por defecto: rosa pastel como color principal
export const DEFAULT_THEME = Object.freeze({
  primary: '#F4B6C2', // rosa pastel
  secondary: '#7D3C52', // rosa profundo (contraste / acentos)
  background: '#FFF8F9',
  surface: '#FFFFFF', // tarjetas
  text: '#34242A',
  textMuted: '#7B6168',
  border: '#F2D9DE',
  button: '#7D3C52',
  buttonText: '#FFFFFF',
  price: '#7D3C52',
});

export const THEME_KEYS = Object.keys(DEFAULT_THEME);

export const themeSchema = z
  .object(Object.fromEntries(THEME_KEYS.map((k) => [k, hexColor()])))
  .partial()
  .strict();

/** Combina el tema guardado con los valores por defecto (para claves nuevas o faltantes). */
export function resolveTheme(stored) {
  const theme = { ...DEFAULT_THEME };
  if (stored && typeof stored === 'object') {
    for (const key of THEME_KEYS) {
      if (typeof stored[key] === 'string') theme[key] = stored[key];
    }
  }
  return theme;
}
