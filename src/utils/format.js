/** Formatea un precio decimal ("1250.00") como moneda: $1,250.00 */
export function formatPrice(value, currency = 'MXN', locale = 'es-MX') {
  const amount = Number(value);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}
