import { env } from '../config/env.js';
import { forbidden } from '../utils/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Defensa adicional contra CSRF: las peticiones que modifican datos deben
 * provenir de un origen permitido (o de un cliente sin cabecera Origin, p. ej. curl).
 */
export function originCheck(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next();
  const host = `${req.protocol}://${req.get('host')}`;
  if (env.frontendOrigins.includes(origin) || origin === host) return next();
  next(forbidden('Origen no permitido'));
}
