import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatMonto } from '../constants.js';

export default function Cierre({ onCerrado }) {
  const [preview, setPreview] = useState(undefined);
  const [contados, setContados] = useState({});
  const [chequesContados, setChequesContados] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.previewCierre()
      .then((r) => {
        setPreview(r);
        const init = {};
        Object.keys(r.saldos).forEach((m) => { init[m] = ''; });
        setContados(init);
        setChequesContados('');
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (preview === undefined) return <p style={{ color: 'var(--text-muted)' }}>Cargando…</p>;

  async function confirmarCierre(e) {
    e.preventDefault();
    setGuardando(true); setError('');
    try {
      const saldosContados = {};
      Object.entries(contados).forEach(([m, v]) => { saldosContados[m] = Number(v) || 0; });
      const res = await api.confirmarCierre({
        saldosContados,
        chequesContados: Number(chequesContados) || 0,
        observaciones,
      });
      setResultado(res);
      onCerrado && onCerrado();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (resultado) {
    return (
      <div className="card">
        <h3>Cierre de caja confirmado</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          El cierre quedó guardado en el historial y no puede modificarse. Solo un administrador puede reabrirlo.
        </p>
        <table>
          <thead><tr><th>Moneda</th><th>Esperado</th><th>Contado</th><th>Diferencia</th></tr></thead>
          <tbody>
            {Object.entries(resultado.diferencias).map(([moneda, d]) => (
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
    );
  }

  return (
    <div>
      <h2 className="section-title">Cierre de caja y arqueo</h2>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Resumen de la jornada (saldos esperados por sistema)</h3>
        <div className="grid grid-3" style={{ marginBottom: 14 }}>
          <div><div className="stat-label">Operaciones</div><div className="stat-value">{preview.totalOperaciones}</div></div>
          <div><div className="stat-label">Pendientes</div><div className="stat-value" style={{ color: 'var(--accent)' }}>{preview.totalesPorEstado.pendiente}</div></div>
          <div><div className="stat-label">Finalizadas</div><div className="stat-value" style={{ color: 'var(--positive)' }}>{preview.totalesPorEstado.finalizada}</div></div>
        </div>
        <table>
          <thead><tr><th>Tipo</th><th>Cantidad de operaciones</th></tr></thead>
          <tbody>
            {Object.entries(preview.totalesPorTipo).map(([tipo, n]) => (
              <tr key={tipo}><td className="text-cell">{tipo}</td><td>{n}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={confirmarCierre}>
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Arqueo — saldos reales contados</h3>
          <div className="form-grid">
            {Object.entries(preview.saldos).map(([moneda, esperado]) => (
              <div className="field" key={moneda}>
                <label>{moneda} (esperado: {formatMonto(esperado, moneda)})</label>
                <input type="number" step="0.00000001" value={contados[moneda] ?? ''}
                  onChange={(e) => setContados({ ...contados, [moneda]: e.target.value })} />
              </div>
            ))}
            <div className="field">
              <label>Cheques en cartera (esperado: {preview.chequesCartera})</label>
              <input type="number" value={chequesContados} onChange={(e) => setChequesContados(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Observaciones de cierre</h3>
          <div className="field">
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas sobre diferencias encontradas u otras observaciones" />
          </div>
        </div>

        {error && <div className="alert error">{error}</div>}
        <button className="btn" disabled={guardando}>
          {guardando ? 'Cerrando caja…' : 'Confirmar cierre de caja'}
        </button>
      </form>
    </div>
  );
}
