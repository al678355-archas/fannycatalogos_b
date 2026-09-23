import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePrice, isSafeUrl, parseOrThrow, price } from '../src/utils/validation.js';
import { resolveTheme, DEFAULT_THEME, themeSchema } from '../src/utils/theme.js';
import { formatPrice } from '../src/utils/format.js';
import { z } from 'zod';

test('parsePrice normaliza precios enteros y decimales', () => {
  assert.equal(parsePrice('1250'), '1250.00');
  assert.equal(parsePrice('1,250.5'), '1250.50');
  assert.equal(parsePrice('$1,250.00'), '1250.00');
  assert.equal(parsePrice(99.9), '99.90');
  assert.equal(parsePrice('0'), '0.00');
});

test('parsePrice rechaza valores no válidos', () => {
  assert.equal(parsePrice('-5'), null);
  assert.equal(parsePrice('12.345'), null);
  assert.equal(parsePrice('abc'), null);
  assert.equal(parsePrice(''), null);
  assert.equal(parsePrice('12345678901'), null);
});

test('el esquema de precio lanza error descriptivo', () => {
  const schema = z.object({ price: price() });
  assert.deepEqual(parseOrThrow(schema, { price: '1,250' }), { price: '1250.00' });
  assert.throws(() => parseOrThrow(schema, { price: '1.999' }), /Precio no válido/);
  assert.throws(() => parseOrThrow(schema, {}), /precio es obligatorio/i);
});

test('isSafeUrl bloquea esquemas peligrosos', () => {
  for (const ok of ['', '/catalogo', '#contacto', 'https://x.com', 'mailto:a@b.com', 'tel:+521']) {
    assert.ok(isSafeUrl(ok), ok);
  }
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', '//evil.com', 'ftp://x']) {
    assert.ok(!isSafeUrl(bad), bad);
  }
});

test('resolveTheme completa claves faltantes y el esquema valida hex', () => {
  const theme = resolveTheme({ primary: '#FF0000', unknown: 'x' });
  assert.equal(theme.primary, '#FF0000');
  assert.equal(theme.text, DEFAULT_THEME.text);
  assert.ok(!('unknown' in theme));
  assert.ok(themeSchema.safeParse({ primary: '#abc' }).success);
  assert.ok(!themeSchema.safeParse({ primary: 'red' }).success);
});

test('formatPrice usa formato monetario', () => {
  assert.equal(formatPrice('1250.00', 'MXN', 'es-MX'), '$1,250.00');
});
