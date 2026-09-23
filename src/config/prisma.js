import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { pgConnectionString } from './database.js';

// Las consultas pasan por el driver `pg` de Node. A diferencia del motor nativo de Prisma,
// Node prueba IPv6 e IPv4 automáticamente, lo que evita fallos de conexión en redes
// con IPv6 defectuoso.
const adapter = new PrismaPg({ connectionString: pgConnectionString(process.env.DATABASE_URL) });

// Instancia única de Prisma para toda la aplicación
export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
});
