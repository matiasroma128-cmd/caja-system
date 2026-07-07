export const FIAT = ['ARS', 'USD', 'EUR'];
export const CRYPTO_DEFAULT = ['USDT', 'BTC', 'ETH'];

export const TIPOS_MOVIMIENTO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'cripto', label: 'Criptomoneda' },
];

export const ESTADOS_MOVIMIENTO = [
  { value: 'finalizada', label: 'Finalizada' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'parcial', label: 'Parcial' },
];

export function monedasParaTipo(tipo, criptos) {
  if (tipo === 'cripto') return criptos;
  if (tipo === 'cheque') return FIAT;
  return FIAT;
}

export function formatMonto(valor, moneda) {
  const n = Number(valor || 0);
  const decimales = CRYPTO_DEFAULT.includes(moneda) || !FIAT.includes(moneda) ? 8 : 2;
  return n.toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

export function formatFechaHora(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleString('es-AR');
}
