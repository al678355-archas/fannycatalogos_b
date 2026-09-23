import { getSiteSettings, getFooter, catalogUrlFrom } from './siteService.js';
import { listActiveProducts } from './productService.js';
import { readImageBuffer } from './imageService.js';
import { resolveTheme } from '../utils/theme.js';

const IMAGE_CONCURRENCY = 6;

async function safeRead(asset) {
  if (!asset) return null;
  try {
    return await readImageBuffer(asset);
  } catch (err) {
    console.warn('[pdf] Imagen no disponible:', asset.id, err.message);
    return null;
  }
}

/** Descarga en lotes para no saturar el storage con catálogos grandes */
async function mapLimited(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Reúne los datos actuales de la base para generar el PDF */
export async function buildCatalogPdfData() {
  const [settings, footer, products] = await Promise.all([
    getSiteSettings(),
    getFooter(),
    listActiveProducts(),
  ]);

  const [logo, imageBuffers] = await Promise.all([
    safeRead(settings.logo),
    mapLimited(products, IMAGE_CONCURRENCY, (p) => safeRead(p.image)),
  ]);

  return {
    site: {
      siteName: settings.siteName,
      catalogTitle: settings.catalogTitle,
      catalogSubtitle: settings.catalogSubtitle,
      catalogUrl: catalogUrlFrom(settings),
      currency: settings.currency,
      locale: settings.locale,
      pdfFooterText: settings.pdfFooterText,
      theme: resolveTheme(settings.theme),
    },
    contact: { email: footer.email, phone: footer.phone, address: footer.address },
    logo,
    products: products.map((p, i) => ({
      name: p.name,
      description: p.description,
      price: p.price.toFixed(2),
      imageBuffer: imageBuffers[i],
    })),
  };
}

export async function getCatalogUrl() {
  return catalogUrlFrom(await getSiteSettings());
}

/** URL pública del catálogo + logo del sitio (si existe) para el código QR */
export async function getCatalogQrData() {
  const settings = await getSiteSettings();
  return { url: catalogUrlFrom(settings), logo: await safeRead(settings.logo) };
}
