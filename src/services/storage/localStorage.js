import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.resolve(__dirname, '../../../uploads');

// Sólo nombres generados por el sistema (evita path traversal)
const SAFE_KEY = /^[a-z0-9-]+\.(jpg|png)$/;

function resolveKey(key) {
  if (!SAFE_KEY.test(key)) throw new Error('storageKey no válido');
  return path.join(UPLOADS_DIR, key);
}

/** Proveedor de almacenamiento en disco. Útil en desarrollo; en Render el disco es efímero. */
export const localStorageProvider = {
  name: 'local',

  async save({ buffer, key }) {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.writeFile(resolveKey(key), buffer);
    return { storageKey: key, url: `/uploads/${key}` };
  },

  async remove(key) {
    try {
      await fs.unlink(resolveKey(key));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  },

  async read(asset) {
    return fs.readFile(resolveKey(asset.storageKey));
  },
};
