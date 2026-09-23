import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import jsQR from 'jsqr';
import { buildQr } from '../src/services/qrService.js';

const URL = 'https://fannycatalogos.vercel.app/catalogo';

/** Lee el PNG y devuelve el texto decodificado del QR (o null) */
async function decode(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? null;
}

// Logo de prueba oscuro y "ruidoso": el peor caso para la lectura del QR
const logo = await sharp({
  create: { width: 600, height: 300, channels: 4, background: { r: 125, g: 60, b: 82, alpha: 1 } },
})
  .composite([
    {
      input: Buffer.from(
        '<svg width="600" height="300"><circle cx="150" cy="150" r="120" fill="#000"/><rect x="330" y="60" width="220" height="180" fill="#222"/></svg>',
      ),
    },
  ])
  .png()
  .toBuffer();

test('QR sin logo se decodifica a la URL del catálogo', async () => {
  const png = await buildQr(URL, { size: 512 });
  assert.equal(await decode(png), URL);
});

test('QR con logo en el centro sigue siendo legible', async () => {
  for (const size of [256, 512, 1024]) {
    const png = await buildQr(URL, { size, logo });
    const meta = await sharp(png).metadata();
    assert.equal(meta.width, size);
    assert.equal(await decode(png), URL, `no se pudo leer el QR de ${size}px`);
    if (process.env.QR_PREVIEW && size === 512) fs.writeFileSync(process.env.QR_PREVIEW, png);
  }
});

test('QR SVG incluye el logo incrustado', async () => {
  const svg = await buildQr(URL, { format: 'svg', logo });
  assert.match(svg, /<image [^>]*href="data:image\/png;base64,/);
  assert.match(svg, /<\/svg>\s*$/);
});

test('un logo inválido no rompe el QR', async () => {
  const png = await buildQr(URL, { size: 512, logo: Buffer.from('no es una imagen') });
  assert.equal(await decode(png), URL);
});
