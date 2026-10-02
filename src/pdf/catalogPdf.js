import PDFDocument from 'pdfkit';
import { PDF_LAYOUT as L, PDF_FONTS as F, PDF_SIZES as S, pdfPalette } from './pdfTheme.js';
import { formatPrice } from '../utils/format.js';

// Las fuentes estándar de PDF sólo soportan Latin-1 (WinAnsi); se reemplazan otros caracteres.
const REPLACEMENTS = { '→': '->', '←': '<-', '✓': '*', '★': '*' };
const UNSUPPORTED = /[^\n\t\u0020-\u007E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC]/gu;
export function pdfSafe(value) {
  return String(value ?? '')
    .replace(UNSUPPORTED, (ch) => REPLACEMENTS[ch] ?? '')
    .trim();
}

const PER_PAGE = L.columns * L.rows;
const pad2 = (n) => String(n).padStart(2, '0');

/**
 * Agrupa por categoría respetando el orden de los productos.
 * Sin categoría → "Otros" (al final), o "Productos" si ninguno tiene categoría.
 */
export function groupByCategory(products) {
  const groups = new Map();
  for (const product of products) {
    const name = pdfSafe(product.category);
    const key = name.toLocaleLowerCase('es');
    if (!groups.has(key)) groups.set(key, { name, products: [] });
    groups.get(key).products.push(product);
  }
  const uncategorized = groups.get('');
  groups.delete('');
  const list = [...groups.values()];
  if (uncategorized) list.push({ ...uncategorized, name: list.length ? 'Otros' : 'Productos' });
  return list;
}

/**
 * Genera el PDF del catálogo y lo escribe en `stream`.
 * Estructura: portada → índice → por cada categoría, páginas de 4 productos (2 × 2).
 * @param {object} data
 * @param {object} data.site      { siteName, catalogTitle, catalogSubtitle, catalogUrl, currency, locale, theme, pdfFooterText }
 * @param {object} data.contact   { email, phone, address }
 * @param {Buffer|null} data.logo
 * @param {Buffer|null} data.qr   QR del catálogo público (se muestra en la portada)
 * @param {Array}  data.products  [{ name, description, category, price, imageBuffer }]
 * @param {object} [options]
 * @param {boolean} [options.styled=true] true = colores de la página pública; false = blanco y negro
 */
export function renderCatalogPdf(data, stream, { styled = true } = {}) {
  const { site, contact = {}, logo, qr, products } = data;
  const doc = new PDFDocument({
    size: L.size,
    layout: 'portrait',
    margin: L.margin,
    bufferPages: true,
    info: {
      Title: pdfSafe(`${site.catalogTitle} - ${site.siteName}`),
      Author: pdfSafe(site.siteName),
      Subject: 'Catálogo de productos',
    },
  });
  doc.pipe(stream);

  const box = {
    x: L.margin,
    y: L.margin,
    w: doc.page.width - L.margin * 2,
    h: doc.page.height - L.margin * 2,
  };
  const ctx = { doc, box, site, contact, c: pdfPalette(site.theme, styled) };

  const groups = groupByCategory(products);
  const indexRows = Math.floor((box.h - 150 - L.footerHeight) / L.indexRowHeight);
  const indexPages = groups.length ? Math.ceil(groups.length / indexRows) : 0;

  // Número de página (1 = portada) en que empieza cada categoría, para el índice
  let nextPage = 2 + indexPages;
  for (const group of groups) {
    group.startPage = nextPage;
    nextPage += Math.ceil(group.products.length / PER_PAGE);
  }

  drawCover(ctx, { logo, qr });

  if (groups.length === 0) {
    doc.addPage();
    doc
      .font(F.displayItalic)
      .fontSize(16)
      .fillColor(ctx.c.muted)
      .text('No hay productos disponibles en este momento.', box.x, box.y + box.h / 2 - 20, {
        width: box.w,
        align: 'center',
      });
  }

  for (let i = 0; i < indexPages; i++) {
    doc.addPage();
    drawIndexPage(ctx, groups.slice(i * indexRows, (i + 1) * indexRows), i === 0, i * indexRows);
  }

  groups.forEach((group, gi) => {
    for (let start = 0; start < group.products.length; start += PER_PAGE) {
      doc.addPage();
      drawCategoryBanner(ctx, group, gi, start === 0);
      drawProductGrid(ctx, group.products.slice(start, start + PER_PAGE));
    }
  });

  drawFooters(ctx);
  doc.end();
}

/* ─── Portada ─── */

function drawCover({ doc, box, site, contact, c }, { logo, qr }) {
  const { x, y, w, h } = box;
  const cx = (width) => x + (w - width) / 2;

  // Fondo y marco (siempre dentro de los márgenes de 2 cm)
  doc.save();
  if (c.styled) {
    doc.roundedRect(x, y, w, h, 18).clip();
    doc.rect(x, y, w, h).fill(c.coverBg);
    doc.circle(x + w - 30, y + 40, 150).fillOpacity(0.45).fill(c.accent);
    doc.circle(x + 20, y + h - 30, 120).fillOpacity(0.08).fill(c.accentText);
    doc.fillOpacity(1);
  }
  doc.restore();
  doc
    .roundedRect(x + 14, y + 14, w - 28, h - 28, 12)
    .lineWidth(c.styled ? 1.2 : 0.8)
    .stroke(c.styled ? '#FFFFFF' : c.text);

  // Bloque central (logo + títulos) centrado verticalmente sobre la tarjeta inferior
  const cardH = 112;
  const cardY = y + h - 40 - cardH;
  const blockH = coverBlockHeight(doc, site, w, logo ? 122 : 0);
  let ty = y + 14 + Math.max(30, (cardY - y - 14 - blockH) / 2);
  if (logo) {
    try {
      doc.image(logo, cx(170), ty, { fit: [170, 96], align: 'center', valign: 'center' });
    } catch {
      // Logo con formato no soportado: se omite
    }
    ty += 122;
  }

  doc
    .font(F.bold)
    .fontSize(S.eyebrow + 1)
    .fillColor(c.accentText)
    .text(pdfSafe(site.siteName).toUpperCase(), x + 40, ty, { width: w - 80, align: 'center', characterSpacing: 3 });
  ty = doc.y + 14;

  doc
    .font(F.display)
    .fontSize(S.coverTitle)
    .fillColor(c.text)
    .text(pdfSafe(site.catalogTitle), x + 40, ty, { width: w - 80, align: 'center', lineGap: -4 });
  ty = doc.y + 16;

  doc.rect(cx(70), ty, 70, 2).fill(c.styled ? c.accentText : c.text);
  ty += 20;

  if (site.catalogSubtitle) {
    doc
      .font(F.displayItalic)
      .fontSize(S.coverSubtitle)
      .fillColor(c.text)
      .text(pdfSafe(site.catalogSubtitle), x + 60, ty, { width: w - 120, align: 'center', height: 64, ellipsis: true });
    ty = doc.y + 12;
  }

  const edition = new Intl.DateTimeFormat(site.locale, { month: 'long', year: 'numeric' }).format(new Date());
  doc
    .font(F.regular)
    .fontSize(S.eyebrow)
    .fillColor(c.muted)
    .text(`EDICIÓN ${pdfSafe(edition).toUpperCase()}`, x + 40, ty, { width: w - 80, align: 'center', characterSpacing: 2 });

  // Bloque inferior: QR + enlace + contacto
  const cardW = w - 100;
  const cardX = cx(cardW);
  if (c.styled) doc.roundedRect(cardX, cardY, cardW, cardH, 12).fill('#FFFFFF');
  else doc.roundedRect(cardX, cardY, cardW, cardH, 12).lineWidth(0.6).stroke(c.border);

  let textX = cardX + 20;
  if (qr) {
    try {
      doc.image(qr, cardX + 14, cardY + 14, { fit: [cardH - 28, cardH - 28] });
      textX = cardX + cardH + 4;
    } catch {
      // QR no disponible: se omite
    }
  }
  const textW = cardX + cardW - 18 - textX;
  doc
    .font(F.bold)
    .fontSize(11)
    .fillColor(c.text)
    .text(qr ? 'Escanea y descubre el catálogo en línea' : 'Catálogo en línea', textX, cardY + 22, { width: textW });
  doc
    .font(F.regular)
    .fontSize(9)
    .fillColor(c.accentText)
    .text(pdfSafe(site.catalogUrl), textX, doc.y + 4, { width: textW, height: 24, ellipsis: true });
  const contactLine = [contact.phone, contact.email].filter(Boolean).map(pdfSafe).join('   ·   ');
  if (contactLine) {
    doc
      .font(F.regular)
      .fontSize(9)
      .fillColor(c.muted)
      .text(contactLine, textX, doc.y + 6, { width: textW, height: 24, ellipsis: true });
  }
}

/** Alto del bloque de títulos de la portada (mismas fuentes y anchos que drawCover) */
function coverBlockHeight(doc, site, w, logoH) {
  let h = logoH;
  h += doc.font(F.bold).fontSize(S.eyebrow + 1).heightOfString(pdfSafe(site.siteName).toUpperCase(), { width: w - 80, characterSpacing: 3 }) + 14;
  h += doc.font(F.display).fontSize(S.coverTitle).heightOfString(pdfSafe(site.catalogTitle), { width: w - 80, lineGap: -4 }) + 16 + 20;
  if (site.catalogSubtitle) {
    h += Math.min(64, doc.font(F.displayItalic).fontSize(S.coverSubtitle).heightOfString(pdfSafe(site.catalogSubtitle), { width: w - 120 })) + 12;
  }
  return h + 12;
}

/* ─── Índice ─── */

function drawIndexPage({ doc, box, c }, groups, isFirst, offset) {
  const { x, y, w } = box;
  doc
    .font(F.bold)
    .fontSize(S.eyebrow)
    .fillColor(c.accentText)
    .text('CONTENIDO', x, y + 6, { width: w, characterSpacing: 3 });
  doc
    .font(F.display)
    .fontSize(36)
    .fillColor(c.text)
    .text(isFirst ? 'Índice' : 'Índice (continuación)', x, doc.y + 4, { width: w });
  let ry = doc.y + 14;
  doc.rect(x, ry, w, c.styled ? 2 : 1).fill(c.styled ? c.accent : c.text);
  ry += 26;

  groups.forEach((group, i) => {
    const num = pad2(offset + i + 1);
    const count = group.products.length;
    if (c.styled && i % 2 === 0) {
      doc.roundedRect(x, ry - 6, w, L.indexRowHeight - 4, 8).fill(c.soft);
    }
    doc
      .font(F.displayItalic)
      .fontSize(20)
      .fillColor(c.accentText)
      .text(num, x + 12, ry, { width: 40, lineBreak: false });

    const nameX = x + 58;
    doc.font(F.bold).fontSize(12.5).fillColor(c.text);
    const name = group.name;
    const nameW = Math.min(doc.widthOfString(name), w - 160);
    doc.text(name, nameX, ry, { width: nameW, height: 15, ellipsis: true, lineBreak: false });
    doc
      .font(F.regular)
      .fontSize(8.5)
      .fillColor(c.muted)
      .text(`${count} ${count === 1 ? 'producto' : 'productos'}`, nameX, ry + 16, { lineBreak: false });

    // Línea punteada hasta el número de página
    const pageX = x + w - 50;
    const dotsFrom = nameX + nameW + 8;
    if (pageX - 8 > dotsFrom) {
      doc
        .moveTo(dotsFrom, ry + 10)
        .lineTo(pageX - 8, ry + 10)
        .dash(1, { space: 3 })
        .lineWidth(0.8)
        .stroke(c.muted)
        .undash();
    }
    doc
      .font(F.bold)
      .fontSize(12.5)
      .fillColor(c.accentText)
      .text(String(group.startPage), pageX, ry, { width: 38, align: 'right', lineBreak: false });
    ry += L.indexRowHeight;
  });
}

/* ─── Categoría + productos ─── */

function drawCategoryBanner({ doc, box, site, c }, group, index, isFirst) {
  const { x, y, w } = box;
  const h = L.bannerHeight;
  if (c.styled) {
    doc.roundedRect(x, y, w, h, 12).fill(c.soft);
    doc.roundedRect(x, y, 6, h, 3).fill(c.accentText);
  }
  const tx = x + (c.styled ? 24 : 0);
  doc
    .font(F.bold)
    .fontSize(S.eyebrow)
    .fillColor(c.accentText)
    .text(`SECCIÓN ${pad2(index + 1)}${isFirst ? '' : '  ·  CONTINUACIÓN'}`, tx, y + 14, {
      width: w * 0.6,
      characterSpacing: 2,
      lineBreak: false,
    });
  doc
    .font(F.display)
    .fontSize(S.sectionTitle)
    .fillColor(c.text)
    .text(group.name, tx, y + 30, { width: w * 0.66, height: 32, ellipsis: true, lineBreak: false });

  const count = group.products.length;
  const rx = x + w * 0.62;
  const rw = w * 0.38 - (c.styled ? 20 : 0);
  doc
    .font(F.displayItalic)
    .fontSize(12)
    .fillColor(c.muted)
    .text(`${count} ${count === 1 ? 'producto' : 'productos'}`, rx, y + 22, { width: rw, align: 'right' });
  doc
    .font(F.regular)
    .fontSize(8.5)
    .fillColor(c.muted)
    .text(pdfSafe(site.catalogTitle), rx, y + 42, { width: rw, align: 'right', height: 12, ellipsis: true });

  if (!c.styled) doc.rect(x, y + h - 4, w, 1).fill(c.text);
}

function gridMetrics(box) {
  const top = box.y + L.bannerHeight + L.bannerGap;
  const bottom = box.y + box.h - L.footerHeight - 6;
  const cardW = (box.w - L.gutter * (L.columns - 1)) / L.columns;
  const cardH = (bottom - top - L.gutter * (L.rows - 1)) / L.rows;
  return { top, cardW, cardH };
}

function drawProductGrid(ctx, products) {
  const { top, cardW, cardH } = gridMetrics(ctx.box);
  products.forEach((product, i) => {
    const col = i % L.columns;
    const row = Math.floor(i / L.columns);
    drawProductCard(ctx, {
      product,
      x: ctx.box.x + col * (cardW + L.gutter),
      y: top + row * (cardH + L.gutter),
      width: cardW,
      height: cardH,
    });
  });
}

function drawProductCard({ doc, site, c }, { product, x, y, width, height }) {
  const p = L.cardPadding;
  const innerW = width - p * 2;
  const imageH = Math.round(height * L.imageRatio);

  if (c.styled) {
    doc.roundedRect(x, y, width, height, L.cardRadius).lineWidth(0.8).fillAndStroke(c.surface, c.border);
  } else {
    doc.roundedRect(x, y, width, height, L.cardRadius).lineWidth(0.6).stroke(c.border);
  }

  // Foto: se ajusta sin recortarse sobre un fondo suave
  const imgX = x + p;
  const imgY = y + p;
  if (c.styled) doc.roundedRect(imgX, imgY, innerW, imageH, 7).fill(c.soft);
  let imageDrawn = false;
  if (product.imageBuffer) {
    try {
      doc.save();
      doc.roundedRect(imgX, imgY, innerW, imageH, 7).clip();
      doc.image(product.imageBuffer, imgX, imgY, { fit: [innerW, imageH], align: 'center', valign: 'center' });
      doc.restore();
      imageDrawn = true;
    } catch {
      doc.restore();
    }
  }
  if (!imageDrawn) {
    if (!c.styled) doc.roundedRect(imgX, imgY, innerW, imageH, 7).lineWidth(0.5).dash(2, { space: 2 }).stroke(c.border).undash();
    doc
      .font(F.displayItalic)
      .fontSize(11)
      .fillColor(c.muted)
      .text('Sin imagen', imgX, imgY + imageH / 2 - 6, { width: innerW, align: 'center' });
  }

  // Precio fijo en la parte inferior
  const priceH = 18;
  const priceY = y + height - p - priceH + 3;
  doc.rect(x + p, priceY - 7, innerW, 0.6).fill(c.border);
  doc
    .font(F.bold)
    .fontSize(S.price)
    .fillColor(c.price)
    .text(formatPrice(product.price, site.currency, site.locale), x + p, priceY, { width: innerW, lineBreak: false });

  // Nombre (máx. 2 líneas)
  let ty = imgY + imageH + 9;
  doc
    .font(F.bold)
    .fontSize(S.productName)
    .fillColor(c.text)
    .text(pdfSafe(product.name), x + p, ty, { width: innerW, height: 30, ellipsis: true, lineGap: 1 });
  ty = Math.min(doc.y, ty + 30) + 3;

  // Descripción: ocupa el espacio restante y se trunca con "…"
  const descH = priceY - 10 - ty;
  if (product.description && descH > 10) {
    doc
      .font(F.regular)
      .fontSize(S.description)
      .fillColor(c.muted)
      .text(pdfSafe(product.description), x + p, ty, { width: innerW, height: descH, ellipsis: true, lineGap: 1.5 });
  }
}

/* ─── Pie de página (todas menos la portada) ─── */

function drawFooters({ doc, box, site, contact, c }) {
  const range = doc.bufferedPageRange();
  const contactLine = [contact.phone, contact.email, site.catalogUrl].filter(Boolean).map(pdfSafe).join('   ·   ');
  const leftText = pdfSafe(site.pdfFooterText) || contactLine || pdfSafe(site.siteName);

  for (let i = range.start + 1; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const fy = box.y + box.h - 10;
    // Evita que PDFKit agregue páginas al escribir cerca del margen inferior
    const originalBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.rect(box.x, fy - 8, box.w, 0.6).fill(c.border);
    doc
      .font(F.regular)
      .fontSize(S.footer)
      .fillColor(c.muted)
      .text(leftText, box.x, fy, { width: box.w * 0.75, lineBreak: false, ellipsis: true, height: 10 });
    doc.text(`Página ${i + 1} de ${range.count}`, box.x + box.w * 0.75, fy, {
      width: box.w * 0.25,
      align: 'right',
      lineBreak: false,
    });
    doc.page.margins.bottom = originalBottom;
  }
}
