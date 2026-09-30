import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { createApp } from './app.js';
import { startKeepAlive } from './services/keepAlive.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`API escuchando en el puerto ${env.port} (${env.nodeEnv}, storage: ${env.storageDriver})`);
});

// Sólo en producción: en local no hay nada que mantener despierto
const stopKeepAlive = env.isProduction ? startKeepAlive(env.keepAliveUrl) : null;

async function shutdown(signal) {
  console.log(`${signal} recibido, cerrando...`);
  stopKeepAlive?.();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
