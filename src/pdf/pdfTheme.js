// Parámetros de diseño del PDF del catálogo.
// Modifica estos valores para cambiar el aspecto sin tocar la lógica de maquetación.
// Unidades en puntos tipográficos (72 pt = 1 pulgada = 2.54 cm).

const CM = 72 / 2.54;

export const PDF_LAYOUT = {
  size: 'LETTER', // 8.5 × 11 in = 612 × 792 pt, siempre vertical
  margin: 2 * CM, // 2 cm en los cuatro lados: nada se imprime fuera de esta zona
  // Rejilla de productos: 2 × 2 = 4 por página
  columns: 2,
  rows: 2,
  gutter: 14,
  cardPadding: 10,
  cardRadius: 10,
  imageRatio: 0.58, // porción de la tarjeta que ocupa la foto
  bannerHeight: 74, // encabezado de categoría (todas las páginas de productos)
  bannerGap: 16,
  footerHeight: 22,
  indexRowHeight: 40,
};

export const PDF_FONTS = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  italic: 'Helvetica-Oblique',
  display: 'Times-Roman',
  displayItalic: 'Times-Italic',
};

export const PDF_SIZES = {
  coverTitle: 44,
  coverSubtitle: 15,
  eyebrow: 9,
  sectionTitle: 26,
  productName: 12,
  price: 13,
  description: 8.8,
  footer: 8,
};

/** Mezcla un color hex con blanco (t = 0 → color original, t = 1 → blanco) */
export function tint(hex, t) {
  const n = parseInt(hex.slice(1, 7), 16);
  const ch = (shift) => Math.round(((n >> shift) & 255) + (255 - ((n >> shift) & 255)) * t);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Colores del PDF.
 * - Con estilo: se derivan de la paleta de la página pública (Apariencia).
 * - Sin estilo: blanco y negro, sin rellenos de color (ideal para imprimir barato).
 */
export function pdfPalette(theme, styled) {
  if (!styled) {
    return {
      styled: false,
      text: '#111111',
      muted: '#555555',
      accent: '#111111',
      accentText: '#111111',
      price: '#111111',
      border: '#BDBDBD',
      surface: null,
      soft: null,
      coverBg: null,
    };
  }
  return {
    styled: true,
    text: theme.text,
    muted: theme.textMuted,
    accent: theme.primary,
    accentText: theme.secondary,
    price: theme.price,
    border: theme.border,
    surface: theme.surface,
    soft: tint(theme.primary, 0.72),
    coverBg: tint(theme.primary, 0.55),
  };
}
