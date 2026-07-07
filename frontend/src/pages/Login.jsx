import React, { useState } from 'react';
import { api, setToken } from '../api.js';

export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const data = await api.login(usuario, password);
      setToken(data.token);
      onLogin(data.usuario, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>Caja<span style={{ color: 'var(--accent)' }}>·</span>Diaria</h1>
        <p className="sub">Apertura y cierre de caja, tesorería y arqueo.</p>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Usuario</label>
            <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn" style={{ width: '100%' }} disabled={cargando}>
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
        <div className="hint">
          Usuarios de prueba (creados con <code>npm run seed</code>):<br />
          admin / admin123 (administrador)<br />
          cajero / cajero123 (cajero)
        </div>
      </div>
    </div>
  );
}
