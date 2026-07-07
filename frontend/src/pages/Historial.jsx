import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import DetalleCierre from './DetalleCierre.jsx';

export default function Historial({ currentUser }) {
  const [cierres, setCierres] = useState([]);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [error, setError] = useState('');

  async function cargar() {
    try {
      const r = await api.historial(desde, hasta);
      setCierres(r.cierres);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { cargar(); }, []);

  if (seleccionado) {
    return <DetalleCierre id={seleccionado} currentUser={currentUser} onVolver={() => { setSeleccionado(null); cargar(); }} />;
  }

  return (
    <div>
      <h2 className="section-title">Historial de cierres</h2>
      {error && <div className="alert error">{error}</div>}

      <div className="toolbar">
        <div className="field">
          <label>Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="field">
          <label>Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <button className="btn secondary" style={{ alignSelf: 'flex-end' }} onClick={cargar}>Buscar</button>
      </div>

      <div className="card">
        {cierres.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No se encontraron cierres en el rango seleccionado.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Fecha</th><th>Hora cierre</th><th>Usuario</th><th>Operaciones</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {cierres.map((c) => (
                <tr key={c.id}>
                  <td className="text-cell">{c.fecha}</td>
                  <td>{c.hora_cierre}</td>
                  <td className="text-cell">{c.usuario_cierre}</td>
                  <td>{c.total_operaciones}</td>
                  <td className="text-cell">
                    <span className={`tag ${c.bloqueado ? 'finalizada' : 'pendiente'}`}>
                      {c.bloqueado ? 'Cerrado' : 'Reabierto'}
                    </span>
                  </td>
                  <td className="text-cell">
                    <button className="btn secondary" onClick={() => setSeleccionado(c.id)}>Ver detalle</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
