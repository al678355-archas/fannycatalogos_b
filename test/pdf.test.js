import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import fs from 'node:fs';
import sharp from 'sharp';
import { renderCatalogPdf, pdfSafe, groupByCategory } from '../src/pdf/catalogPdf.js';
import { DEFAULT_THEME } from '../src/utils/theme.js';

function render(data, options) {
  return new Promise((resolve, reject) => {
    const stream = new PassThrough();
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
    renderCatalogPdf(data, stream, options);
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

test('genera portada, índice y 4 productos por página en carta vertical', async () => {
  const image = await sharp({
    create: { width: 400, height: 500, channels: 3, background: '#F4B6C2' },
  })
    .jpeg()
    .toBuffer();

  const products = Array.from({ length: 11 }, (_, i) => ({
    name: `Producto ${i + 1} con un nombre bastante largo para probar el truncado`,
    description: 'Descripción del producto. '.repeat(i + 1),
    category: i < 6 ? 'Labios' : 'Ojos',
    price: (1250 + i * 10.5).toFixed(2),
    imageBuffer: i % 3 === 0 ? null : image,
  }));

  for (const styled of [true, false]) {
    const pdf = await render({ site, contact: { email: 'hola@example.com' }, logo: image, qr: image, products }, { styled });
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.match(pdf.toString('latin1'), /\/MediaBox \[0 0 612 792\]/);
    // Portada + índice + Labios (6 → 2 páginas) + Ojos (5 → 2 páginas)
    assert.equal(countPages(pdf), 6);
    if (process.env.PDF_PREVIEW) fs.writeFileSync(process.env.PDF_PREVIEW.replace('.pdf', styled ? '.pdf' : '-plain.pdf'), pdf);
  }
});

test('groupByCategory respeta el orden y deja sin categoría al final', () => {
  const groups = groupByCategory([
    { name: 'a', category: 'Ojos' },
    { name: 'b', category: '' },
    { name: 'c', category: 'Labios' },
    { name: 'd', category: 'ojos' },
  ]);
  assert.deepEqual(
    groups.map((g) => [g.name, g.products.map((p) => p.name).join('')]),
    [['Ojos', 'ad'], ['Labios', 'c'], ['Otros', 'b']],
  );
  assert.equal(groupByCategory([{ name: 'x', category: '' }])[0].name, 'Productos');
});

test('genera PDF sin productos', async () => {
  const pdf = await render({ site, logo: null, products: [] });
  // Portada + aviso de catálogo vacío
  assert.equal(countPages(pdf), 2);
});

test('pdfSafe elimina caracteres no soportados', () => {
  assert.equal(pdfSafe('Collar 💖 rosa → nuevo'), 'Collar  rosa -> nuevo');
  assert.equal(pdfSafe('Niño “especial” – 10€'), 'Niño “especial” – 10€');
});
