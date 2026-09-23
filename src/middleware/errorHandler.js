import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors.js';
import { env } from '../config/env.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Recurso no encontrado' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'El registro ya existe' });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON mal formado' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La solicitud es demasiado grande' });
  }

  console.error('[error]', req.method, req.originalUrl, err);
  res.status(500).json({
    error: 'Error interno del servidor',
    ...(env.isProduction ? {} : { debug: err?.message }),
  });
}
