// Normaliza la URL de conexión para el driver `pg`.
// En pg 8, sslmode=require ya equivale a verify-full (verifica el certificado);
// se declara explícitamente para mantener ese comportamiento y evitar el aviso.
export function pgConnectionString(url) {
  if (!url) throw new Error('Falta la variable de entorno DATABASE_URL');
  return url.replace(/sslmode=(require|prefer|verify-ca)\b/, 'sslmode=verify-full');
}
