const express = require('express');
const pool = require('../db');
const { calcularSaldosEsperados } = require('../utils/saldos');

const router = express.Router();

function calcularDiferencias(esperados, contados, chequesEsperados, chequesContados) {
  const diferencias = {};
  const monedas = new Set([...Object.keys(esperados), ...Object.keys(contados)]);

  for (const moneda of monedas) {
    const esperado = Number(esperados[moneda] || 0);
    const contado = Number(contados[moneda] || 0);
    const diferencia = +(contado - esperado).toFixed(8);
    diferencias[moneda] = {
      esperado,
      contado,
      diferencia,
      estado: diferencia > 0 ? 'a_favor' : diferencia < 0 ? 'en_contra' : 'sin_diferencia',
    };
  }

  const diferenciaCheques = (chequesContados || 0) - (chequesEsperados || 0);
  diferencias.CHEQUES = {
    esperado: chequesEsperados,
    contado: chequesContados,
    diferencia: diferenciaCheques,
    estado: diferenciaCheques > 0 ? 'a_favor' : diferenciaCheques < 0 ? 'en_contra' : 'sin_diferencia',
  };

  return diferencias;
}

// Vista previa: saldos esperados de la jornada antes de cerrar
router.get('/preview', async (req, res) => {
  try {
    const aperturaRes = await pool.query("SELECT * FROM aperturas WHERE estado = 'abierta' LIMIT 1");
    if (aperturaRes.rows.length === 0) {
      return res.status(409).json({ error: 'No hay una caja abierta para cerrar.' });
    }
    const data = await calcularSaldosEsperados(aperturaRes.rows[0].id);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al calcular el resumen de cierre.' });
  }
});

// Confirmar el cierre de caja con arqueo
router.post('/', async (req, res) => {
  const { saldosContados = {}, chequesContados = 0, observaciones = '' } = req.body;
  // saldosContados: { ARS: 100000, USD: 500, EUR: 300, USDT: 1000, BTC: 0.01, ... }

  const client = await pool.connect();
  try {
    const aperturaRes = await client.query("SELECT * FROM aperturas WHERE estado = 'abierta' LIMIT 1");
    if (aperturaRes.rows.length === 0) {
      return res.status(409).json({ error: 'No hay una caja abierta para cerrar.' });
    }
    const apertura = aperturaRes.rows[0];
    const data = await calcularSaldosEsperados(apertura.id);

    const diferencias = calcularDiferencias(
      data.saldos,
      saldosContados,
      data.chequesCartera,
      chequesContados
    );

    const totales = {
      totalOperaciones: data.totalOperaciones,
      porMoneda: data.totalesPorMoneda,
      porTipo: data.totalesPorTipo,
      porEstado: data.totalesPorEstado,
    };

    await client.query('BEGIN');

    const cierreRes = await client.query(
      `INSERT INTO cierres
        (apertura_id, usuario_id, fecha, total_operaciones, totales_json, arqueo_json, diferencias_json, observaciones, bloqueado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, TRUE) RETURNING *`,
      [
        apertura.id,
        req.usuario.id,
        apertura.fecha,
        data.totalOperaciones,
        JSON.stringify(totales),
        JSON.stringify({ saldosContados, chequesContados }),
        JSON.stringify(diferencias),
        observaciones,
      ]
    );

    await client.query("UPDATE aperturas SET estado = 'cerrada' WHERE id = $1", [apertura.id]);

    await client.query('COMMIT');
    res.status(201).json({ cierre: cierreRes.rows[0], diferencias, totales });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al confirmar el cierre de caja.' });
  } finally {
    client.release();
  }
});

module.exports = router;
