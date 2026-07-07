import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import { formatMonto, formatFechaHora } from '../constants.js';

export default function Dashboard({ refreshSignal }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const res = await api.dashboard();
      setData(res);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 5000); // refresco automático "en tiempo real"
    return () => clearInterval(interval);
  }, [cargar, refreshSignal]);

  if (error) return <div className="alert error">{error}</div>;
  if (!data) return <p style={{ color: 'var(--text-muted)' }}>Cargando…</p>;

  if (!data.cajaAbierta) {
    return (
      <div className="empty-state">
        <div className="icon">🗄️</div>
        <p>No hay una caja abierta hoy. Andá a <strong>Apertura de caja</strong> para comenzar la jornada.</p>
      </div>
    );
  }

  const monedas = Object.entries(data.saldos);

  return (
    <div>
      <div className="ticker">
        {monedas.map(([moneda, valor]) => (
          <div className="ticker-item" key={moneda}>
            <div className="ticker-label">{moneda}</div>
            <div className="ticker-value">{formatMonto(valor, moneda)}</div>
          </div>
        ))}
        <div className="ticker-item">
          <div className="ticker-label">Cheques en cartera</div>
          <div className="ticker-value">{data.chequesCartera}</div>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="stat-label">Operaciones hoy</div>
          <div className="stat-value">{data.totalOperaciones}</div>
        </div>
        <div className="card">
          <div className="stat-label">Pendientes / Parciales</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>
            {data.pendientes} / {data.parciales}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Finalizadas</div>
          <div className="stat-value" style={{ color: 'var(--positive)' }}>{data.finalizadas}</div>
        </div>
      </div>

      <div className="card">
        <h3>Últimos movimientos</h3>
        {data.ultimosMovimientos.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Todavía no se registraron movimientos hoy.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Hora</th><th>Tipo</th><th>Dirección</th><th>Moneda</th><th>Monto</th><th>Estado</th><th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {data.ultimosMovimientos.map((m) => (
                <tr key={m.id}>
                  <td>{formatFechaHora(m.fecha_hora)}</td>
                  <td className="text-cell">{m.tipo}</td>
                  <td><span className={`tag ${m.direccion}`}>{m.direccion}</span></td>
                  <td>{m.moneda}</td>
                  <td>{formatMonto(m.monto, m.moneda)}</td>
                  <td><span className={`tag ${m.estado}`}>{m.estado}</span></td>
                  <td className="text-cell">{m.usuario_nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
