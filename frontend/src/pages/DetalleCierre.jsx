import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatMonto, formatFechaHora } from '../constants.js';

export default function DetalleCierre({ id, currentUser, onVolver }) {
  const [detalle, setDetalle] = useState(undefined);
  const [error, setError] = useState('');
  const [motivo, setMotivo] = useState('');
  const [mostrarReabrir, setMostrarReabrir] = useState(false);

  async function cargar() {
    try {
      const r = await api.detalleCierre(id);
      setDetalle(r);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { cargar(); }, [id]);

  async function descargar(tipo) {
    try {
      const url = tipo === 'csv' ? api.urlExportarCsv(id) : api.urlExportarPdf(id);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${window.__cajaToken}` } });
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `cierre_${detalle.cierre.fecha}.${tipo}`;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err.message);
    }
  }

  async function reabrir() {
    try {
      await api.reabrirCierre(id, motivo);
      setMostrarReabrir(false);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <div className="alert error">{error}</div>;
  if (detalle === undefined) return <p style={{ color: 'var(--text-muted)' }}>Cargando…</p>;

  const { cierre, apertura, saldosCriptoApertura, movimientos, auditoria } = detalle;
  const totales = cierre.totales_json;
  const arqueo = cierre.arqueo_json;
  const diferencias = cierre.diferencias_json;

  return (
    <div>
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <button className="btn secondary" onClick={onVolver}>← Volver al historial</button>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <button className="btn secondary" onClick={() => descargar('csv')}>Exportar a Excel (CSV)</button>
          <button className="btn secondary" onClick={() => descargar('pdf')}>Generar PDF</button>
          <button className="btn secondary" onClick={() => window.print()}>Imprimir</button>
          {currentUser?.rol === 'administrador' && cierre.bloqueado && (
            <button className="btn danger" onClick={() => setMostrarReabrir(true)}>Reabrir cierre</button>
          )}
        </div>
      </div>

      {mostrarReabrir && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--negative)' }}>
          <h3>Reabrir este cierre</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Esta acción reabre la jornada para edición y queda registrada en el historial de auditoría.
          </p>
          <div className="field" style={{ marginBottom: 10 }}>
            <label>Motivo de la reapertura</label>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <button className="btn danger" onClick={reabrir}>Confirmar reapertura</button>{' '}
          <button className="btn secondary" onClick={() => setMostrarReabrir(false)}>Cancelar</button>
        </div>
      )}

      <h2 className="section-title">Cierre del {cierre.fecha}</h2>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3>Apertura del día</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {apertura.fecha} a las {apertura.hora_apertura} — abierta por {apertura.usuario_apertura}
          </p>
          <table>
            <tbody>
              <tr><td className="text-cell">ARS inicial</td><td>{formatMonto(apertura.saldo_inicial_ars, 'ARS')}</td></tr>
              <tr><td className="text-cell">USD inicial</td><td>{formatMonto(apertura.saldo_inicial_usd, 'USD')}</td></tr>
              <tr><td className="text-cell">EUR inicial</td><td>{formatMonto(apertura.saldo_inicial_eur, 'EUR')}</td></tr>
              {saldosCriptoApertura.map((c) => (
                <tr key={c.moneda}><td className="text-cell">{c.moneda} inicial</td><td>{formatMonto(c.saldo_inicial, c.moneda)}</td></tr>
              ))}
              <tr><td className="text-cell">Cheques iniciales</td><td>{apertura.cheques_iniciales}</td></tr>
            </tbody>
          </table>
          {apertura.observaciones && <p style={{ fontSize: 12, marginTop: 10 }}>Obs. apertura: {apertura.observaciones}</p>}
        </div>

        <div className="card">
          <h3>Cierre</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {cierre.fecha} a las {cierre.hora_cierre} — cerrado por {cierre.usuario_cierre}
          </p>
          <table>
            <tbody>
              <tr><td className="text-cell">Total de operaciones</td><td>{cierre.total_operaciones}</td></tr>
              <tr><td className="text-cell">Efectivo</td><td>{totales.porTipo.efectivo}</td></tr>
              <tr><td className="text-cell">Transferencias</td><td>{totales.porTipo.transferencia}</td></tr>
              <tr><td className="text-cell">Cheques</td><td>{totales.porTipo.cheque}</td></tr>
              <tr><td className="text-cell">Cripto</td><td>{totales.porTipo.cripto}</td></tr>
              <tr><td className="text-cell">Pendientes</td><td>{totales.porEstado.pendiente}</td></tr>
              <tr><td className="text-cell">Parciales</td><td>{totales.porEstado.parcial}</td></tr>
              <tr><td className="text-cell">Finalizadas</td><td>{totales.porEstado.finalizada}</td></tr>
            </tbody>
          </table>
          {cierre.observaciones && <p style={{ fontSize: 12, marginTop: 10 }}>Obs. cierre: {cierre.observaciones}</p>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Arqueo y diferencias</h3>
        <table>
          <thead><tr><th>Moneda</th><th>Esperado</th><th>Contado</th><th>Diferencia</th></tr></thead>
          <tbody>
            {Object.entries(diferencias).map(([moneda, d]) => (
              <tr key={moneda} className={`diff-row ${d.estado}`}>
                <td className="text-cell">{moneda}</td>
                <td>{formatMonto(d.esperado, moneda)}</td>
                <td>{formatMonto(d.contado, moneda)}</td>
                <td>{d.diferencia > 0 ? '+' : ''}{formatMonto(d.diferencia, moneda)} — {d.estado.replace('_', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Totales operados por moneda</h3>
        <table>
          <thead><tr><th>Moneda</th><th>Total operado</th></tr></thead>
          <tbody>
            {Object.entries(totales.porMoneda).map(([moneda, total]) => (
              <tr key={moneda}><td className="text-cell">{moneda}</td><td>{formatMonto(total, moneda)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Movimientos de la jornada ({movimientos.length})</h3>
        <table>
          <thead><tr><th>Hora</th><th>Tipo</th><th>Dir.</th><th>Moneda</th><th>Monto</th><th>Estado</th><th>Usuario</th></tr></thead>
          <tbody>
            {movimientos.map((m) => (
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
      </div>

      {auditoria.length > 0 && (
        <div className="card">
          <h3>Historial de auditoría</h3>
          <table>
            <thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Campo</th><th>Antes</th><th>Después</th></tr></thead>
            <tbody>
              {auditoria.map((a) => (
                <tr key={a.id}>
                  <td>{formatFechaHora(a.fecha_hora)}</td>
                  <td className="text-cell">{a.usuario_nombre}</td>
                  <td className="text-cell">{a.accion}</td>
                  <td className="text-cell">{a.campo_modificado}</td>
                  <td className="text-cell">{a.valor_anterior}</td>
                  <td className="text-cell">{a.valor_nuevo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
