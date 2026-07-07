import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { TIPOS_MOVIMIENTO, ESTADOS_MOVIMIENTO, FIAT, CRYPTO_DEFAULT, formatMonto, formatFechaHora } from '../constants.js';

export default function Movimientos({ onRegistrado }) {
  const [movimientos, setMovimientos] = useState([]);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState({
    tipo: 'efectivo', direccion: 'ingreso', moneda: 'ARS', monto: '',
    cantidadCheques: 1, estado: 'finalizada', descripcion: '',
  });

  async function cargar() {
    try {
      const r = await api.listarMovimientos();
      setMovimientos(r.movimientos);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { cargar(); }, []);

  const opcionesMoneda = form.tipo === 'cripto' ? CRYPTO_DEFAULT : FIAT;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setExito(''); setGuardando(true);
    try {
      await api.registrarMovimiento({
        ...form,
        monto: Number(form.monto),
        cantidadCheques: Number(form.cantidadCheques) || 1,
      });
      setExito('Movimiento registrado. Los saldos de caja se actualizaron automáticamente.');
      setForm({ ...form, monto: '', descripcion: '' });
      cargar();
      onRegistrado && onRegistrado();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(id, estado) {
    try {
      await api.actualizarEstadoMovimiento(id, estado);
      cargar();
      onRegistrado && onRegistrado();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2 className="section-title">Registrar movimiento</h2>
      {error && <div className="alert error">{error}</div>}
      {exito && <div className="alert success">{exito}</div>}

      <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 24 }}>
        <div className="form-grid">
          <div className="field">
            <label>Tipo de operación</label>
            <select value={form.tipo} onChange={(e) => {
              const tipo = e.target.value;
              const moneda = tipo === 'cripto' ? CRYPTO_DEFAULT[0] : 'ARS';
              setForm({ ...form, tipo, moneda });
            }}>
              {TIPOS_MOVIMIENTO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Dirección</label>
            <select value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })}>
              <option value="ingreso">Ingreso (recibe)</option>
              <option value="egreso">Egreso (entrega)</option>
            </select>
          </div>
          <div className="field">
            <label>Moneda</label>
            <select value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })}>
              {opcionesMoneda.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Monto</label>
            <input type="number" step="0.00000001" required value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })} />
          </div>
          {form.tipo === 'cheque' && (
            <div className="field">
              <label>Cantidad de cheques</label>
              <input type="number" min="1" value={form.cantidadCheques}
                onChange={(e) => setForm({ ...form, cantidadCheques: e.target.value })} />
            </div>
          )}
          <div className="field">
            <label>Estado</label>
            <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              {ESTADOS_MOVIMIENTO.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Descripción (opcional)</label>
            <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
        </div>
        <button className="btn" style={{ marginTop: 16 }} disabled={guardando}>
          {guardando ? 'Registrando…' : 'Registrar movimiento'}
        </button>
      </form>

      <div className="card">
        <h3>Movimientos de hoy</h3>
        {movimientos.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin movimientos registrados todavía.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Hora</th><th>Tipo</th><th>Dir.</th><th>Moneda</th><th>Monto</th><th>Estado</th><th>Usuario</th><th>Descripción</th><th></th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m) => (
                <tr key={m.id}>
                  <td>{formatFechaHora(m.fecha_hora)}</td>
                  <td className="text-cell">{m.tipo}</td>
                  <td><span className={`tag ${m.direccion}`}>{m.direccion}</span></td>
                  <td>{m.moneda}</td>
                  <td>{formatMonto(m.monto, m.moneda)}</td>
                  <td>
                    <select value={m.estado} onChange={(e) => cambiarEstado(m.id, e.target.value)}
                      style={{ background: 'var(--panel-alt)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, padding: '3px 6px' }}>
                      {ESTADOS_MOVIMIENTO.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="text-cell">{m.usuario_nombre}</td>
                  <td className="text-cell">{m.descripcion || '—'}</td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
