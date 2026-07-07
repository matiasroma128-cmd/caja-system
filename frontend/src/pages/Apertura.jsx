import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { CRYPTO_DEFAULT } from '../constants.js';

export default function Apertura({ onAbierta }) {
  const [aperturaActual, setAperturaActual] = useState(undefined); // undefined = cargando
  const [form, setForm] = useState({
    saldoInicialArs: '', saldoInicialUsd: '', saldoInicialEur: '',
    chequesIniciales: '', observaciones: '',
  });
  const [criptos, setCriptos] = useState(CRYPTO_DEFAULT.map((m) => ({ moneda: m, saldoInicial: '' })));
  const [nuevaCripto, setNuevaCripto] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.aperturaActual().then((r) => setAperturaActual(r.apertura)).catch((e) => setError(e.message));
  }, []);

  function actualizarCripto(i, valor) {
    setCriptos((prev) => prev.map((c, idx) => (idx === i ? { ...c, saldoInicial: valor } : c)));
  }

  function agregarCripto() {
    const moneda = nuevaCripto.trim().toUpperCase();
    if (!moneda || criptos.some((c) => c.moneda === moneda)) return;
    setCriptos((prev) => [...prev, { moneda, saldoInicial: '' }]);
    setNuevaCripto('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setExito(''); setGuardando(true);
    try {
      const payload = {
        saldoInicialArs: Number(form.saldoInicialArs) || 0,
        saldoInicialUsd: Number(form.saldoInicialUsd) || 0,
        saldoInicialEur: Number(form.saldoInicialEur) || 0,
        chequesIniciales: Number(form.chequesIniciales) || 0,
        observaciones: form.observaciones,
        saldosCripto: criptos
          .filter((c) => c.saldoInicial !== '')
          .map((c) => ({ moneda: c.moneda, saldoInicial: Number(c.saldoInicial) })),
      };
      const res = await api.abrirCaja(payload);
      setExito('Caja abierta correctamente. Ya podés registrar movimientos.');
      setAperturaActual(res.apertura);
      onAbierta && onAbierta();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (aperturaActual === undefined) return <p style={{ color: 'var(--text-muted)' }}>Cargando…</p>;

  if (aperturaActual) {
    return (
      <div className="card">
        <h3>La caja de hoy ya está abierta</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Apertura registrada el {aperturaActual.fecha} a las {aperturaActual.hora_apertura} por{' '}
          {aperturaActual.usuario_nombre || 'el usuario actual'}. Para abrir una nueva jornada, primero
          tenés que realizar el cierre de caja del día.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-title">Apertura de caja</h2>
      {error && <div className="alert error">{error}</div>}
      {exito && <div className="alert success">{exito}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Saldos iniciales en moneda fiat</h3>
          <div className="form-grid">
            <div className="field">
              <label>Pesos Argentinos (ARS)</label>
              <input type="number" step="0.01" value={form.saldoInicialArs}
                onChange={(e) => setForm({ ...form, saldoInicialArs: e.target.value })} />
            </div>
            <div className="field">
              <label>Dólares (USD)</label>
              <input type="number" step="0.01" value={form.saldoInicialUsd}
                onChange={(e) => setForm({ ...form, saldoInicialUsd: e.target.value })} />
            </div>
            <div className="field">
              <label>Euros (EUR)</label>
              <input type="number" step="0.01" value={form.saldoInicialEur}
                onChange={(e) => setForm({ ...form, saldoInicialEur: e.target.value })} />
            </div>
            <div className="field">
              <label>Cheques en cartera al iniciar (opcional)</label>
              <input type="number" value={form.chequesIniciales}
                onChange={(e) => setForm({ ...form, chequesIniciales: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Saldos iniciales en criptomonedas</h3>
          <div className="form-grid">
            {criptos.map((c, i) => (
              <div className="field" key={c.moneda}>
                <label>{c.moneda}</label>
                <input type="number" step="0.00000001" value={c.saldoInicial}
                  onChange={(e) => actualizarCripto(i, e.target.value)} />
              </div>
            ))}
          </div>
          <div className="toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
            <input placeholder="Agregar otra cripto (ej: SOL)" value={nuevaCripto}
              onChange={(e) => setNuevaCripto(e.target.value)}
              style={{ background: 'var(--panel-alt)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)' }} />
            <button type="button" className="btn secondary" onClick={agregarCripto}>+ Agregar moneda</button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Observaciones de apertura</h3>
          <div className="field">
            <textarea value={form.observaciones} placeholder="Notas sobre el inicio de la jornada (opcional)"
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
          </div>
        </div>

        <button className="btn" disabled={guardando}>
          {guardando ? 'Abriendo caja…' : 'Confirmar apertura de caja'}
        </button>
      </form>
    </div>
  );
}
