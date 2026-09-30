import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { startKeepAlive } from '../src/services/keepAlive.js';

test('startKeepAlive hace ping periódico a /health', async () => {
  const hits = [];
  const server = http.createServer((req, res) => {
    hits.push(req.url);
    res.end('{"ok":true}');
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const stop = startKeepAlive(`http://127.0.0.1:${server.address().port}`, { interval: 50 });
  await new Promise((resolve) => setTimeout(resolve, 180));
  stop();
  await new Promise((resolve) => server.close(resolve));
  assert.ok(hits.length >= 2);
  assert.ok(hits.every((url) => url === '/health'));
});

test('startKeepAlive sin URL no arranca', () => {
  assert.equal(startKeepAlive(''), null);
});
