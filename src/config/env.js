// Lectura y validación centralizada de variables de entorno.
// Ningún otro módulo debe leer process.env directamente.

function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  }
  return value.trim();
}

function list(value) {
  return (value || '')
    .split(',')
    .map((v) => v.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const jwtSecret = required('JWT_SECRET');
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
}

const frontendOrigins = list(process.env.FRONTEND_URL || 'http://localhost:5173');
const sameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();

export const env = Object.freeze({
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT) || 4000,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  cookieSameSite: ['lax', 'strict', 'none'].includes(sameSite) ? sameSite : 'lax',
  frontendOrigins,
  publicFrontendUrl: frontendOrigins[0],
  backendUrl: (process.env.BACKEND_URL || '').replace(/\/+$/, ''),
  storageDriver: (process.env.STORAGE_DRIVER || 'local').toLowerCase(),
  maxUploadBytes: (Number(process.env.MAX_UPLOAD_MB) || 5) * 1024 * 1024,
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'cms-catalogo',
  },
});
