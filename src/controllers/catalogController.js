import { buildCatalogPdfData, getCatalogUrl, getCatalogQrData } from '../services/catalogService.js';
import { buildQr } from '../services/qrService.js';
import { renderCatalogPdf } from '../pdf/catalogPdf.js';

export async function share(_req, res) {
  res.json({ url: await getCatalogUrl() });
}

export async function qr(req, res) {
  const format = req.query.format === 'svg' ? 'svg' : 'png';
  const size = Math.min(Math.max(Number(req.query.size) || 512, 128), 2048);
  // Si hay un logo guardado, se muestra en el centro del QR
  const { url, logo } = await getCatalogQrData();
  const output = await buildQr(url, { format, size, logo });

  res.set('Cache-Control', 'no-cache');
  if (req.query.download === '1') {
    res.attachment(`qr-catalogo.${format}`);
  }
  res.type(format === 'svg' ? 'image/svg+xml' : 'image/png').send(output);
}

export async function pdf(req, res) {
  const data = await buildCatalogPdfData();
  const date = new Date().toISOString().slice(0, 10);
  const disposition = req.query.inline === '1' ? 'inline' : 'attachment';

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `${disposition}; filename="catalogo-${date}.pdf"`,
    // Siempre se genera con los productos actuales
    'Cache-Control': 'no-store',
  });
  renderCatalogPdf(data, res);
}
