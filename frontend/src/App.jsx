import React, { useState } from 'react';
import { setToken } from './api.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Apertura from './pages/Apertura.jsx';
import Movimientos from './pages/Movimientos.jsx';
import Cierre from './pages/Cierre.jsx';
import Historial from './pages/Historial.jsx';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: '◈' },
  { key: 'apertura', label: 'Apertura de caja', icon: '▣' },
  { key: 'movimientos', label: 'Movimientos', icon: '⇄' },
  { key: 'cierre', label: 'Cierre y arqueo', icon: '◐' },
  { key: 'historial', label: 'Historial', icon: '☰' },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [refreshSignal, setRefreshSignal] = useState(0);

  function handleLogin(usuario) {
    setCurrentUser(usuario);
  }

  function handleLogout() {
    setToken(null);
    setCurrentUser(null);
    setPage('dashboard');
  }

  function bump() { setRefreshSignal((s) => s + 1); }

  if (!currentUser) return <Login onLogin={handleLogin} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Caja<span className="dot">·</span>Diaria</div>
        <div className="brand-sub">Tesorería y arqueo</div>

        {NAV.map((item) => (
          <div
            key={item.key}
            className={`nav-item ${page === item.key ? 'active' : ''}`}
            onClick={() => setPage(item.key)}
          >
            <span>{item.icon}</span> {item.label}
          </div>
        ))}

        <div className="sidebar-footer">
          <div className="user-name">{currentUser.nombre}</div>
          <span className={`role-badge ${currentUser.rol === 'administrador' ? 'admin' : ''}`}>
            {currentUser.rol}
          </span>
          <div className="logout-link" onClick={handleLogout}>Cerrar sesión</div>
        </div>
      </aside>

      <div className="main-area">
        <div className="topbar">
          <h1>{NAV.find((n) => n.key === page)?.label}</h1>
        </div>
        <div className="content">
          {page === 'dashboard' && <Dashboard refreshSignal={refreshSignal} />}
          {page === 'apertura' && <Apertura onAbierta={bump} />}
          {page === 'movimientos' && <Movimientos onRegistrado={bump} />}
          {page === 'cierre' && <Cierre onCerrado={bump} />}
          {page === 'historial' && <Historial currentUser={currentUser} />}
        </div>
      </div>
    </div>
  );
}
