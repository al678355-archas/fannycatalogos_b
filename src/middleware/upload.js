import multer from 'multer';
import { env } from '../config/env.js';
import { badRequest } from '../utils/errors.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Memoria: el archivo se procesa con sharp y luego se envía al proveedor de storage
const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1, fields: 10 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(badRequest('Formato no permitido. Usa JPG, PNG o WEBP'));
    }
    cb(null, true);
  },
});

/** Acepta un único archivo en el campo "image" y traduce los errores de multer */
export function singleImage(req, res, next) {
  uploader.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? `La imagen supera el tamaño máximo de ${Math.round(env.maxUploadBytes / 1048576)} MB`
          : 'Error al procesar el archivo';
      return next(badRequest(message));
    }
    next(err);
  });
}
