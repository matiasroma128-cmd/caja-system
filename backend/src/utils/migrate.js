const fs = require('fs');
const path = require('path');
const pool = require('../db');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, '../../sql/schema.sql'), 'utf8');
  console.log('Aplicando esquema a la base de datos...');
  await pool.query(sql);
  console.log('Esquema aplicado correctamente.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Error al migrar:', err);
  process.exit(1);
});
