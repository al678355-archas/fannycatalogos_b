import PDFDocument from 'pdfkit';
import { PDF_LAYOUT as L, PDF_FONTS as F, PDF_SIZES as S } from './pdfTheme.js';
import { formatPrice } from '../utils/format.js';

// Las fuentes estándar de PDF sólo soportan Latin-1 (WinAnsi); se reemplazan otros caracteres.
const REPLACEMENTS = { '→': '->', '←': '<-', '✓': '*', '★': '*' };
const UNSUPPORTED = /[^\n\t\u0020-\u007E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC]/gu;
export function pdfSafe(value) {
  return String(value ?? '')
    .replace(UNSUPPORTED, (ch) => REPLACEMENTS[ch] ?? '')
    .trim();
}

/**
 * Genera el PDF del catálogo y lo escribe en `stream`.
 * @param {object} data
 * @param {object} data.site      { siteName, catalogTitle, catalogSubtitle, catalogUrl, currency, locale, theme, pdfFooterText }
 * @param {object} data.contact   { email, phone, address }
 * @param {Buffer|null} data.logo
 * @param {Array}  data.products  [{ name, description, price, imageBuffer }]
 */
export function renderCatalogPdf(data, stream) {
  const { site, contact = {}, logo, products } = data;
  const theme = site.theme;
  const doc = new PDFDocument({
    size: L.size,
    margin: L.margin,
    bufferPages: true,
    info: {
      Title: pdfSafe(`${site.catalogTitle} - ${site.siteName}`),
      Author: pdfSafe(site.siteName),
      Subject: 'Catálogo de productos',
    },
  });
  doc.pipe(stream);

  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const contentW = pageW - L.margin * 2;
  const bottomLimit = pageH - L.margin - L.footerHeight;
  const cardW = (contentW - L.gutter * (L.columns - 1)) / L.columns;

  let y = drawCoverHeader(doc, { site, logo, theme, contentW });

  if (products.length === 0) {
    doc
      .font(F.italic)
      .fontSize(12)
      .fillColor(theme.textMuted)
      .text('No hay productos disponibles en este momento.', L.margin, y + 40, {
        width: contentW,
        align: 'center',
      });
  }

  products.forEach((product, index) => {
    const col = index % L.columns;
    if (col === 0 && index > 0) y += L.cardHeight + L.gutter;
    // Salto de página antes de una fila que no cabe completa (nunca se corta una tarjeta)
    if (col === 0 && y + L.cardHeight > bottomLimit) {
      doc.addPage();
      y = drawPageHeader(doc, { site, theme, contentW });
    }
    const x = L.margin + col * (cardW + L.gutter);
    drawProductCard(doc, { product, x, y, width: cardW, site, theme });
  });

  drawFooters(doc, { site, contact, theme, contentW });
  doc.end();
}

function drawCoverHeader(doc, { site, logo, theme, contentW }) {
  const top = L.margin;
  let textX = L.margin;
  let headerH = 0;

  if (logo) {
    try {
      doc.image(logo, L.margin, top, { fit: [L.logoMaxWidth, L.logoMaxHeight], valign: 'center' });
      textX = L.margin + L.logoMaxWidth + 16;
      headerH = L.logoMaxHeight;
    } catch {
      // Logo con formato no soportado: se omite
    }
  }

  const textW = contentW - (textX - L.margin);
  doc
    .font(F.bold)
    .fontSize(S.title)
    .fillColor(theme.secondary)
    .text(pdfSafe(site.catalogTitle), textX, top + 2, { width: textW, align: logo ? 'right' : 'left' });
  doc
    .font(F.regular)
    .fontSize(S.subtitle)
    .fillColor(theme.text)
    .text(pdfSafe(site.siteName), textX, doc.y + 2, { width: textW, align: logo ? 'right' : 'left' });

  const dateText = new Intl.DateTimeFormat(site.locale, { dateStyle: 'long' }).format(new Date());
  doc
    .fontSize(S.meta)
    .fillColor(theme.textMuted)
    .text(`Actualizado: ${pdfSafe(dateText)}`, textX, doc.y + 2, {
      width: textW,
      align: logo ? 'right' : 'left',
    });

  let y = Math.max(top + headerH, doc.y) + 14;

  if (site.catalogSubtitle) {
    doc
      .font(F.regular)
      .fontSize(S.subtitle)
      .fillColor(theme.text)
      .text(pdfSafe(site.catalogSubtitle), L.margin, y, { width: contentW });
    y = doc.y + 10;
  }

  doc.rect(L.margin, y, contentW, 3).fill(theme.primary);
  return y + 18;
}

function drawPageHeader(doc, { site, theme, contentW }) {
  const top = L.margin;
  doc
    .font(F.bold)
    .fontSize(10)
    .fillColor(theme.secondary)
    .text(pdfSafe(site.catalogTitle), L.margin, top, { width: contentW / 2 });
  doc
    .font(F.regular)
    .fontSize(9)
    .fillColor(theme.textMuted)
    .text(pdfSafe(site.siteName), L.margin + contentW / 2, top, { width: contentW / 2, align: 'right' });
  doc.rect(L.margin, top + 18, contentW, 1.5).fill(theme.primary);
  return top + 32;
}

function drawProductCard(doc, { product, x, y, width, site, theme }) {
  const p = L.cardPadding;
  const innerW = width - p * 2;

  doc.save();
  doc.roundedRect(x, y, width, L.cardHeight, L.cardRadius).lineWidth(0.8).fillAndStroke(theme.surface, theme.border);
  doc.restore();

  // Área de imagen con fondo suave; la imagen se ajusta sin recortarse
  const imgX = x + p;
  const imgY = y + p;
  doc.save();
  doc.roundedRect(imgX, imgY, innerW, L.imageHeight, 6).fill(theme.background);
  doc.restore();
  let imageDrawn = false;
  if (product.imageBuffer) {
    try {
      doc.image(product.imageBuffer, imgX + 4, imgY + 4, {
        fit: [innerW - 8, L.imageHeight - 8],
        align: 'center',
        valign: 'center',
      });
      imageDrawn = true;
    } catch {
      imageDrawn = false;
    }
  }
  if (!imageDrawn) {
    doc
      .font(F.italic)
      .fontSize(9)
      .fillColor(theme.textMuted)
      .text('Sin imagen', imgX, imgY + L.imageHeight / 2 - 5, { width: innerW, align: 'center' });
  }

  // Nombre (máx. 2 líneas) y precio
  let ty = imgY + L.imageHeight + 10;
  doc
    .font(F.bold)
    .fontSize(S.productName)
    .fillColor(theme.text)
    .text(pdfSafe(product.name), x + p, ty, { width: innerW, height: 30, ellipsis: true, lineGap: 1 });
  ty = Math.min(doc.y, imgY + L.imageHeight + 40) + 3;

  doc
    .font(F.bold)
    .fontSize(S.price)
    .fillColor(theme.price)
    .text(formatPrice(product.price, site.currency, site.locale), x + p, ty, { width: innerW });
  ty = doc.y + 4;

  // Descripción: ocupa el espacio restante y se trunca con "…"
  const descH = y + L.cardHeight - p - ty;
  if (product.description && descH > 10) {
    doc
      .font(F.regular)
      .fontSize(S.description)
      .fillColor(theme.textMuted)
      .text(pdfSafe(product.description), x + p, ty, {
        width: innerW,
        height: descH,
        ellipsis: true,
        lineGap: 1.5,
      });
  }
}

function drawFooters(doc, { site, contact, theme, contentW }) {
  const range = doc.bufferedPageRange();
  const contactLine = [contact.phone, contact.email, site.catalogUrl]
    .filter(Boolean)
    .map(pdfSafe)
    .join('   ·   ');
  const leftText = pdfSafe(site.pdfFooterText) || contactLine || pdfSafe(site.siteName);

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const fy = doc.page.height - L.margin - L.footerHeight + 12;
    // Evita que PDFKit agregue páginas al escribir cerca del margen inferior
    const originalBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.rect(L.margin, fy - 8, contentW, 0.8).fill(theme.border);
    doc
      .font(F.regular)
      .fontSize(S.footer)
      .fillColor(theme.textMuted)
      .text(leftText, L.margin, fy, { width: contentW * 0.75, lineBreak: false, ellipsis: true, height: 12 });
    doc.text(`Página ${i + 1} de ${range.count}`, L.margin + contentW * 0.75, fy, {
      width: contentW * 0.25,
      align: 'right',
      lineBreak: false,
    });
    doc.page.margins.bottom = originalBottom;
  }
}
