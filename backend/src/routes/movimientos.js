const express = require('express');
const pool = require('../db');

const router = express.Router();

async function obtenerAperturaAbierta() {
  const result = await pool.query("SELECT * FROM aperturas WHERE estado = 'abierta' LIMIT 1");
  return result.rows[0] || null;
}

// Listar movimientos de la apertura abierta (o de una apertura específica)
router.get('/', async (req, res) => {
  try {
    let aperturaId = req.query.aperturaId;
    if (!aperturaId) {
      const apertura = await obtenerAperturaAbierta();
      if (!apertura) return res.json({ movimientos: [] });
      aperturaId = apertura.id;
    }
    const result = await pool.query(
      `SELECT m.*, u.nombre AS usuario_nombre
       FROM movimientos m JOIN usuarios u ON u.id = m.usuario_id
       WHERE m.apertura_id = $1 ORDER BY m.fecha_hora DESC`,
      [aperturaId]
    );
    res.json({ movimientos: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar movimientos.' });
  }
});

// Registrar un nuevo movimiento (actualiza saldos automáticamente)
router.post('/', async (req, res) => {
  const {
    tipo,            // efectivo | transferencia | cheque | cripto
    direccion,       // ingreso | egreso
    moneda,          // ARS, USD, EUR, USDT, BTC, ETH...
    monto,
    cantidadCheques = 1,
    estado = 'finalizada', // pendiente | parcial | finalizada
    descripcion = '',
  } = req.body;

  if (!tipo || !direccion || !moneda || monto === undefined) {
    return res.status(400).json({ error: 'Faltan datos obligatorios del movimiento.' });
  }

  try {
    const apertura = await obtenerAperturaAbierta();
    if (!apertura) {
      return res.status(409).json({ error: 'No hay una caja abierta. Debe abrir la caja antes de registrar movimientos.' });
    }

    const result = await pool.query(
      `INSERT INTO movimientos
        (apertura_id, usuario_id, tipo, direccion, moneda, monto, cantidad_cheques, estado, descripcion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        apertura.id,
        req.usuario.id,
        tipo,
        direccion,
        moneda.toUpperCase(),
        monto,
        tipo === 'cheque' ? cantidadCheques : 0,
        estado,
        descripcion,
      ]
    );

    res.status(201).json({ movimiento: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar el movimiento.' });
  }
});

// Actualizar el estado de un movimiento (ej: cheque pendiente -> finalizado)
router.patch('/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  if (!['pendiente', 'parcial', 'finalizada'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido.' });
  }
  try {
    const result = await pool.query(
      `UPDATE movimientos SET estado = $1 WHERE id = $2 RETURNING *`,
      [estado, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Movimiento no encontrado.' });
    res.json({ movimiento: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el movimiento.' });
  }
});

module.exports = router;
