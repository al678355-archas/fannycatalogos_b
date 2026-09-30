// Keep-alive del servidor: el plan gratuito de Render duerme el servicio tras
// 15 minutos sin tráfico entrante. Este ping periódico a la URL PÚBLICA
// (pasa por el proxy de Render, así cuenta como tráfico) lo mantiene despierto
// aunque nadie tenga el frontend abierto. Usa /health, que no toca la base de datos.

export const KEEP_ALIVE_INTERVAL_MS = 12 * 60 * 1000;
const TIMEOUT_MS = 30 * 1000;

/** Un ping al health check. Nunca lanza errores. */
async function ping(url) {
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'User-Agent': 'cms-catalogo-keep-alive' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) console.warn(`[keep-alive] ${url} respondió ${res.status}`);
  } catch (err) {
    console.warn(`[keep-alive] fallo al hacer ping a ${url}: ${err.message}`);
  }
}

/**
 * Inicia el keep-alive contra `${baseUrl}/health` cada `interval` ms.
 * Devuelve una función para detenerlo (o null si no hay URL configurada).
 */
export function startKeepAlive(baseUrl, { interval = KEEP_ALIVE_INTERVAL_MS } = {}) {
  if (!baseUrl) {
    console.warn('[keep-alive] sin BACKEND_URL ni RENDER_EXTERNAL_URL: desactivado');
    return null;
  }
  const url = `${baseUrl}/health`;
  const timer = setInterval(() => ping(url), interval);
  console.log(`[keep-alive] ping a ${url} cada ${Math.round(interval / 60000)} min`);
  return () => clearInterval(timer);
}
