const express = require('express');
const pool = require('../db');
const { calcularSaldosEsperados } = require('../utils/saldos');

const router = express.Router();

// Obtener la apertura del día actual (si existe y está abierta)
router.get('/actual', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.nombre AS usuario_nombre
       FROM aperturas a JOIN usuarios u ON u.id = a.usuario_id
       WHERE a.estado = 'abierta'
       ORDER BY a.fecha DESC LIMIT 1`
    );
    if (result.rows.length === 0) return res.json({ apertura: null });

    const apertura = result.rows[0];
    const criptoRes = await pool.query(
      'SELECT moneda, saldo_inicial FROM saldos_cripto_apertura WHERE apertura_id = $1',
      [apertura.id]
    );
    res.json({ apertura, saldosCripto: criptoRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la apertura actual.' });
  }
});

// Crear una nueva apertura de caja
router.post('/', async (req, res) => {
  const {
    saldoInicialArs = 0,
    saldoInicialUsd = 0,
    saldoInicialEur = 0,
    saldosCripto = [], // [{ moneda: 'USDT', saldoInicial: 1000 }, ...]
    chequesIniciales = 0,
    observaciones = '',
  } = req.body;

  const client = await pool.connect();
  try {
    const yaAbierta = await client.query("SELECT id FROM aperturas WHERE estado = 'abierta'");
    if (yaAbierta.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe una caja abierta. Debe cerrarla antes de abrir una nueva.' });
    }

    await client.query('BEGIN');

    const hoy = new Date().toISOString().slice(0, 10);
    const aperturaRes = await client.query(
      `INSERT INTO aperturas
        (fecha, usuario_id, saldo_inicial_ars, saldo_inicial_usd, saldo_inicial_eur, cheques_iniciales, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [hoy, req.usuario.id, saldoInicialArs, saldoInicialUsd, saldoInicialEur, chequesIniciales, observaciones]
    );
    const apertura = aperturaRes.rows[0];

    for (const c of saldosCripto) {
      if (!c.moneda) continue;
      await client.query(
        `INSERT INTO saldos_cripto_apertura (apertura_id, moneda, saldo_inicial) VALUES ($1, $2, $3)`,
        [apertura.id, c.moneda.toUpperCase(), c.saldoInicial || 0]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ apertura });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al abrir la caja.' });
  } finally {
    client.release();
  }
});

module.exports = router;
