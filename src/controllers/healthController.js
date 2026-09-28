/**
 * Health check ultraligero: sólo confirma que Express responde.
 * No consulta la base de datos ni ejecuta ninguna otra operación.
 * `no-store` evita que un proxy o CDN responda en lugar del backend
 * (el keep-alive del frontend necesita que la petición llegue a Render).
 */
export function health(_req, res) {
  res.set('Cache-Control', 'no-store').status(200).json({ ok: true });
}
