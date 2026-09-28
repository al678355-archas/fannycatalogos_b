import { test } from 'node:test';
import assert from 'node:assert/strict';

// Variables mínimas para cargar la app sin base de datos real:
// el health check no debe tocar la base, así que nunca se conecta.
process.env.JWT_SECRET ||= 'test-secret-de-al-menos-treinta-y-dos-caracteres';
process.env.DATABASE_URL ||= 'postgresql://user:pass@127.0.0.1:1/none';

const { createApp } = await import('../src/app.js');

async function withServer(fn) {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('GET /api/health responde { ok: true } sin caché', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });
});

test('GET /health (Render) usa la misma respuesta', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  });
});
