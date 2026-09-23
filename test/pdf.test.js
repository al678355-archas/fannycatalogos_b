import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import fs from 'node:fs';
import sharp from 'sharp';
import { renderCatalogPdf, pdfSafe } from '../src/pdf/catalogPdf.js';
import { DEFAULT_THEME } from '../src/utils/theme.js';

function render(data) {
  return new Promise((resolve, reject) => {
    const stream = new PassThrough();
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
    renderCatalogPdf(data, stream);
  });
}

const site = {
  siteName: 'Mi Marca',
  catalogTitle: 'Catálogo',
  catalogSubtitle: 'Productos de temporada',
  catalogUrl: 'https://example.com/catalogo',
  currency: 'MXN',
  locale: 'es-MX',
  pdfFooterText: '',
  theme: DEFAULT_THEME,
};

const countPages = (pdf) => (pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length;

test('genera un PDF tamaño carta con varias páginas', async () => {
  const image = await sharp({
    create: { width: 400, height: 500, channels: 3, background: '#F4B6C2' },
  })
    .jpeg()
    .toBuffer();

  const products = Array.from({ length: 11 }, (_, i) => ({
    name: `Producto ${i + 1} con un nombre bastante largo para probar el truncado`,
    description: 'Descripción del producto. '.repeat(i + 1),
    price: (1250 + i * 10.5).toFixed(2),
    imageBuffer: i % 3 === 0 ? null : image,
  }));

  const pdf = await render({ site, contact: { email: 'hola@example.com' }, logo: image, products });
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.match(pdf.toString('latin1'), /\/MediaBox \[0 0 612 792\]/);
  // 11 productos → 4 filas de 3; caben 2 filas por página → 2 páginas
  assert.equal(countPages(pdf), 2);

  if (process.env.PDF_PREVIEW) fs.writeFileSync(process.env.PDF_PREVIEW, pdf);
});

test('genera PDF sin productos', async () => {
  const pdf = await render({ site, logo: null, products: [] });
  assert.equal(countPages(pdf), 1);
});

test('pdfSafe elimina caracteres no soportados', () => {
  assert.equal(pdfSafe('Collar 💖 rosa → nuevo'), 'Collar  rosa -> nuevo');
  assert.equal(pdfSafe('Niño “especial” – 10€'), 'Niño “especial” – 10€');
});
