// Aplica las migraciones pendientes de prisma/migrations usando el driver `pg`.
// Equivalente a `prisma migrate deploy` (usa la misma tabla _prisma_migrations y el mismo
// checksum, así que ambos comandos son intercambiables), pero funciona también en redes
// donde el motor nativo de Prisma no logra conectarse (p. ej. IPv6 defectuoso).
// Uso: npm run db:migrate
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { pgConnectionString } from '../src/config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../prisma/migrations');

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" VARCHAR(36) PRIMARY KEY NOT NULL,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMPTZ,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
)`;

async function main() {
  const client = new pg.Client({
    connectionString: pgConnectionString(process.env.DIRECT_URL || process.env.DATABASE_URL),
  });
  await client.connect();
  try {
    await client.query(CREATE_TABLE);
    const { rows } = await client.query(
      'SELECT migration_name, checksum, finished_at FROM "_prisma_migrations" WHERE rolled_back_at IS NULL',
    );
    const applied = new Map(rows.map((r) => [r.migration_name, r]));

    const failed = rows.filter((r) => !r.finished_at);
    if (failed.length) {
      throw new Error(`Hay migraciones fallidas sin resolver: ${failed.map((r) => r.migration_name).join(', ')}`);
    }

    const migrations = fs
      .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    let count = 0;
    for (const name of migrations) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, name, 'migration.sql'), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const existing = applied.get(name);
      if (existing) {
        if (existing.checksum !== checksum) {
          console.warn(`⚠ La migración ${name} fue modificada después de aplicarse.`);
        }
        continue;
      }

      console.log(`→ Aplicando ${name}…`);
      const id = crypto.randomUUID();
      await client.query('BEGIN');
      try {
        await client.query(
          'INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at) VALUES ($1, $2, $3, now())',
          [id, checksum, name],
        );
        await client.query(sql);
        await client.query(
          'UPDATE "_prisma_migrations" SET finished_at = now(), applied_steps_count = 1 WHERE id = $1',
          [id],
        );
        await client.query('COMMIT');
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Falló la migración ${name}: ${err.message}`, { cause: err });
      }
    }
    console.log(count ? `✔ ${count} migración(es) aplicada(s).` : '✔ La base de datos ya está al día.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`✖ ${err.message}`);
  process.exitCode = 1;
});
