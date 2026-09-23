import crypto from 'node:crypto';
import { env } from '../../config/env.js';

// Implementación mínima de la API REST de Cloudinary (sin SDK) para subir y borrar imágenes.
const { cloudName, apiKey, apiSecret, folder } = env.cloudinary;
const API = `https://api.cloudinary.com/v1_1/${cloudName}/image`;

function sign(params) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
}

async function post(endpoint, form) {
  const res = await fetch(`${API}/${endpoint}`, { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Cloudinary respondió ${res.status}`);
  return data;
}

export const cloudinaryStorageProvider = {
  name: 'cloudinary',

  async save({ buffer, key, mimeType }) {
    const publicId = key.replace(/\.[a-z]+$/, '');
    const timestamp = Math.floor(Date.now() / 1000);
    const params = { folder, public_id: publicId, timestamp };
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mimeType }), key);
    Object.entries(params).forEach(([k, v]) => form.append(k, String(v)));
    form.append('api_key', apiKey);
    form.append('signature', sign(params));
    const data = await post('upload', form);
    return { storageKey: data.public_id, url: data.secure_url };
  },

  async remove(key) {
    const timestamp = Math.floor(Date.now() / 1000);
    const params = { public_id: key, timestamp };
    const form = new FormData();
    Object.entries(params).forEach(([k, v]) => form.append(k, String(v)));
    form.append('api_key', apiKey);
    form.append('signature', sign(params));
    await post('destroy', form);
  },

  async read(asset) {
    const res = await fetch(asset.url);
    if (!res.ok) throw new Error(`No se pudo descargar la imagen (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  },
};

export function assertCloudinaryConfig() {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'STORAGE_DRIVER=cloudinary requiere CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET',
    );
  }
}
