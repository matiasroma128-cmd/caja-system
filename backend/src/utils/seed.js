const bcrypt = require('bcryptjs');
const pool = require('../db');

async function seed() {
  const usuarios = [
    { nombre: 'Administrador General', usuario: 'admin', password: 'admin123', rol: 'administrador' },
    { nombre: 'Cajero Turno Mañana', usuario: 'cajero', password: 'cajero123', rol: 'cajero' },
  ];

  for (const u of usuarios) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query(
      `INSERT INTO usuarios (nombre, usuario, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (usuario) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [u.nombre, u.usuario, hash, u.rol]
    );
    console.log(`Usuario listo: ${u.usuario} / ${u.password} (${u.rol})`);
  }

  await pool.end();
}

seed().catch((err) => {
  console.error('Error al sembrar datos:', err);
  process.exit(1);
});
