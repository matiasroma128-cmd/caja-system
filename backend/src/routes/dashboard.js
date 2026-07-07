const express = require('express');
const pool = require('../db');
const { calcularSaldosEsperados } = require('../utils/saldos');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const aperturaRes = await pool.query("SELECT * FROM aperturas WHERE estado = 'abierta' LIMIT 1");
    if (aperturaRes.rows.length === 0) {
      return res.json({ cajaAbierta: false });
    }
    const apertura = aperturaRes.rows[0];
    const data = await calcularSaldosEsperados(apertura.id);

    const ultimosMovRes = await pool.query(
      `SELECT m.*, u.nombre AS usuario_nombre
       FROM movimientos m JOIN usuarios u ON u.id = m.usuario_id
       WHERE m.apertura_id = $1
       ORDER BY m.fecha_hora DESC LIMIT 8`,
      [apertura.id]
    );

    res.json({
      cajaAbierta: true,
      apertura: { id: apertura.id, fecha: apertura.fecha, hora_apertura: apertura.hora_apertura },
      saldos: data.saldos,
      chequesCartera: data.chequesCartera,
      totalOperaciones: data.totalOperaciones,
      pendientes: data.totalesPorEstado.pendiente,
      parciales: data.totalesPorEstado.parcial,
      finalizadas: data.totalesPorEstado.finalizada,
      ultimosMovimientos: ultimosMovRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al construir el dashboard.' });
  }
});

module.exports = router;
