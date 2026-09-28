import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { router } from './routes/index.js';
import { health } from './controllers/healthController.js';
import { originCheck } from './middleware/originCheck.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { UPLOADS_DIR } from './services/storage/localStorage.js';

export function createApp() {
  const app = express();

  // Render / Vercel operan detrás de un proxy (necesario para cookies "secure" e IP real)
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // Permite que el frontend (otro origen) muestre imágenes servidas por esta API
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || env.frontendOrigins.includes(origin)),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    }),
  );
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());
  app.use(originCheck);

  // Usado por Render (healthCheckPath); /api/health usa el mismo controlador
  app.get('/health', health);

  // Archivos subidos con el proveedor local
  app.use(
    '/uploads',
    express.static(UPLOADS_DIR, {
      maxAge: '30d',
      immutable: true,
      index: false,
      dotfiles: 'deny',
    }),
  );

  app.use('/api', router);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
