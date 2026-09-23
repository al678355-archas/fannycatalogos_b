import { env } from '../../config/env.js';
import { localStorageProvider } from './localStorage.js';
import { cloudinaryStorageProvider, assertCloudinaryConfig } from './cloudinaryStorage.js';

// Punto único de acceso al almacenamiento. Para agregar otro proveedor (S3, R2...)
// basta con implementar { name, save, remove, read } y registrarlo aquí.
const providers = {
  local: localStorageProvider,
  cloudinary: cloudinaryStorageProvider,
};

if (!providers[env.storageDriver]) {
  throw new Error(`STORAGE_DRIVER desconocido: ${env.storageDriver}`);
}
if (env.storageDriver === 'cloudinary') assertCloudinaryConfig();

/** Proveedor activo para nuevas subidas */
export const storage = providers[env.storageDriver];

/** Proveedor con el que se guardó un asset existente */
export const providerFor = (asset) => providers[asset.provider] || storage;

/** URL pública absoluta de un asset (las locales se guardan relativas: /uploads/...) */
export function publicUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${env.backendUrl}${url}`;
}
