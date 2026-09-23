import QRCode from 'qrcode';
import sharp from 'sharp';

// El logo ocupa ~22 % del ancho del QR. Con corrección de errores "H" el código tolera
// hasta un 30 % de área cubierta, así que sigue escaneándose sin problema.
const LOGO_BADGE_RATIO = 0.22;
const LOGO_PADDING_RATIO = 0.14;
const QR_COLORS = { dark: '#2B1D22', light: '#FFFFFF' };

/** Insignia blanca redondeada con el logo centrado (PNG cuadrado de `size` px) */
async function logoBadge(logo, size) {
  const inner = Math.round(size * (1 - LOGO_PADDING_RATIO * 2));
  const fitted = await sharp(logo)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const radius = Math.round(size * 0.18);
  const background = Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${QR_COLORS.light}"/></svg>`,
  );
  const offset = Math.round((size - inner) / 2);
  return sharp(background).composite([{ input: fitted, left: offset, top: offset }]).png().toBuffer();
}

async function qrWithLogoPng(qr, logo, size) {
  const badgeSize = Math.round(size * LOGO_BADGE_RATIO);
  const badge = await logoBadge(logo, badgeSize);
  const offset = Math.round((size - badgeSize) / 2);
  return sharp(qr).composite([{ input: badge, left: offset, top: offset }]).png().toBuffer();
}

async function qrWithLogoSvg(svg, logo) {
  // El SVG de qrcode usa un viewBox en "módulos" (ej. 0 0 33 33)
  const viewBox = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  if (!viewBox) return svg;
  const units = Number(viewBox[1]);
  const badgeUnits = units * LOGO_BADGE_RATIO;
  const pos = (units - badgeUnits) / 2;
  const badge = await logoBadge(logo, 256);
  const image = `<image x="${pos}" y="${pos}" width="${badgeUnits}" height="${badgeUnits}" href="data:image/png;base64,${badge.toString('base64')}"/>`;
  return svg.replace('</svg>', `${image}</svg>`);
}

/**
 * Genera el QR del catálogo (PNG o SVG). Si hay logo, se coloca en el centro;
 * si el logo no se puede procesar, se entrega el QR sin logo.
 */
export async function buildQr(url, { format = 'png', size = 512, logo = null } = {}) {
  const options = {
    // Mayor corrección de errores cuando el logo tapa parte del código
    errorCorrectionLevel: logo ? 'H' : 'M',
    margin: 2,
    width: size,
    color: QR_COLORS,
  };

  if (format === 'svg') {
    const svg = await QRCode.toString(url, { ...options, type: 'svg' });
    if (!logo) return svg;
    try {
      return await qrWithLogoSvg(svg, logo);
    } catch (err) {
      console.warn('[qr] No se pudo agregar el logo al SVG:', err.message);
      return svg;
    }
  }

  const png = await QRCode.toBuffer(url, { ...options, type: 'png' });
  if (!logo) return png;
  try {
    return await qrWithLogoPng(png, logo, size);
  } catch (err) {
    console.warn('[qr] No se pudo agregar el logo al PNG:', err.message);
    return png;
  }
}
