import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { singleImage } from '../middleware/upload.js';
import * as auth from '../controllers/authController.js';
import * as admins from '../controllers/adminUserController.js';
import * as products from '../controllers/productController.js';
import * as content from '../controllers/contentController.js';
import * as site from '../controllers/siteController.js';
import * as images from '../controllers/imageController.js';
import * as catalog from '../controllers/catalogController.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
});

const pdfLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' },
});

export const router = Router();

/* Auth */
router.post('/auth/login', loginLimiter, auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', requireAuth, auth.me);
router.put('/auth/password', requireAuth, auth.changePassword);

/* Administradores */
router.get('/admins', requireAuth, admins.listAdmins);
router.post('/admins', requireAuth, admins.createAdmin);
router.patch('/admins/:id', requireAuth, admins.updateAdmin);
router.put('/admins/:id/password', requireAuth, admins.resetPassword);
router.delete('/admins/:id', requireAuth, admins.deleteAdmin);

/* Productos (las rutas fijas van antes de /:id) */
router.get('/products', products.listPublic);
router.get('/products/all', requireAuth, products.listAdmin);
router.get('/products/stats', requireAuth, products.stats);
router.put('/products/reorder', requireAuth, products.reorder);
router.get('/products/:id', products.getPublic);
router.get('/products/:id/admin', requireAuth, products.getAdmin);
router.post('/products', requireAuth, products.create);
router.put('/products/:id', requireAuth, products.update);
router.delete('/products/:id', requireAuth, products.remove);

/* Contenido (secciones del body) */
router.get('/content', content.listPublic);
router.get('/content/all', requireAuth, content.listAdmin);
router.put('/content/reorder', requireAuth, content.reorder);
router.post('/content', requireAuth, content.create);
router.put('/content/:id', requireAuth, content.update);
router.delete('/content/:id', requireAuth, content.remove);

/* Sitio: GET público (todo lo necesario para renderizar), PUT = apariencia */
router.get('/site', site.getPublicSite);
router.put('/site', requireAuth, site.updateSite);
router.get('/settings', requireAuth, site.getSettings);
router.put('/settings', requireAuth, site.updateSettings);
router.get('/header', site.getHeader);
router.put('/header', requireAuth, site.updateHeader);
router.get('/footer', site.getFooter);
router.put('/footer', requireAuth, site.updateFooter);

/* Imágenes */
router.get('/images', requireAuth, images.list);
router.post('/images', requireAuth, singleImage, images.upload);
router.patch('/images/:id', requireAuth, images.updateMeta);
router.delete('/images/:id', requireAuth, images.remove);

/* Catálogo compartible (público) */
router.get('/catalog/share', catalog.share);
router.get('/catalog/qr', catalog.qr);
router.get('/catalog/pdf', pdfLimiter, catalog.pdf);
