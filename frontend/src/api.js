const BASE = 'https://caja-system-production.up.railway.app/api';

function getToken() {
  return window.__cajaToken || null;
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let mensaje = `Error ${res.status}`;
    try {
      const data = await res.json();
      mensaje = data.error || mensaje;
    } catch (_) {}
    throw new Error(mensaje);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res;
}

export const api = {
  login: (usuario, password) => request('/auth/login', { method: 'POST', body: { usuario, password }, auth: false }),
  aperturaActual: () => request('/apertura/actual'),
  abrirCaja: (payload) => request('/apertura', { method: 'POST', body: payload }),
  dashboard: () => request('/dashboard'),
  listarMovimientos: () => request('/movimientos'),
  registrarMovimiento: (payload) => request('/movimientos', { method: 'POST', body: payload }),
  actualizarEstadoMovimiento: (id, estado) => request(`/movimientos/${id}/estado`, { method: 'PATCH', body: { estado } }),
  previewCierre: () => request('/cierre/preview'),
  confirmarCierre: (payload) => request('/cierre', { method: 'POST', body: payload }),
  historial: (desde, hasta) => {
    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    const qs = params.toString();
    return request(`/historial${qs ? `?${qs}` : ''}`);
  },
  detalleCierre: (id) => request(`/historial/${id}`),
  reabrirCierre: (id, motivo) => request(`/historial/${id}/reabrir`, { method: 'POST', body: { motivo } }),
  urlExportarCsv: (id) => `${BASE}/historial/${id}/exportar/csv`,
  urlExportarPdf: (id) => `${BASE}/historial/${id}/exportar/pdf`,
};

export function setToken(token) {
  window.__cajaToken = token;
}
