// Parámetros de diseño del PDF del catálogo.
// Modifica estos valores para cambiar el aspecto sin tocar la lógica de maquetación.
// Unidades en puntos tipográficos (72 pt = 1 pulgada).

export const PDF_LAYOUT = {
  size: 'LETTER', // 8.5 × 11 in = 612 × 792 pt
  margin: 54, // 0.75 in: margen seguro para impresoras domésticas
  columns: 3,
  gutter: 14,
  cardHeight: 262,
  cardPadding: 10,
  cardRadius: 10,
  imageHeight: 138,
  footerHeight: 30,
  logoMaxHeight: 54,
  logoMaxWidth: 150,
};

export const PDF_FONTS = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  italic: 'Helvetica-Oblique',
};

export const PDF_SIZES = {
  title: 24,
  subtitle: 10.5,
  meta: 8.5,
  productName: 11,
  price: 11.5,
  description: 8.5,
  footer: 8,
};
