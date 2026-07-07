const pool = require('../db');

const FIAT = ['ARS', 'USD', 'EUR'];

/**
 * Calcula los saldos esperados de una apertura sumando/restando
 * todos los movimientos registrados durante la jornada.
 */
async function calcularSaldosEsperados(aperturaId) {
  const aperturaRes = await pool.query('SELECT * FROM aperturas WHERE id = $1', [aperturaId]);
  if (aperturaRes.rows.length === 0) throw new Error('Apertura no encontrada');
  const apertura = aperturaRes.rows[0];

  const criptoRes = await pool.query(
    'SELECT moneda, saldo_inicial FROM saldos_cripto_apertura WHERE apertura_id = $1',
    [aperturaId]
  );

  const saldos = {
    ARS: Number(apertura.saldo_inicial_ars),
    USD: Number(apertura.saldo_inicial_usd),
    EUR: Number(apertura.saldo_inicial_eur),
  };
  criptoRes.rows.forEach((r) => {
    saldos[r.moneda] = (saldos[r.moneda] || 0) + Number(r.saldo_inicial);
  });

  let chequesCartera = apertura.cheques_iniciales;

  const movRes = await pool.query(
    'SELECT * FROM movimientos WHERE apertura_id = $1 ORDER BY fecha_hora ASC',
    [aperturaId]
  );

  const totalesPorMoneda = {};
  const totalesPorTipo = { efectivo: 0, transferencia: 0, cheque: 0, cripto: 0 };
  const totalesPorEstado = { pendiente: 0, parcial: 0, finalizada: 0 };

  for (const m of movRes.rows) {
    const monto = Number(m.monto);
    const signo = m.direccion === 'ingreso' ? 1 : -1;

    saldos[m.moneda] = (saldos[m.moneda] || 0) + signo * monto;

    totalesPorMoneda[m.moneda] = (totalesPorMoneda[m.moneda] || 0) + Math.abs(monto);
    totalesPorTipo[m.tipo] = (totalesPorTipo[m.tipo] || 0) + 1;
    totalesPorEstado[m.estado] = (totalesPorEstado[m.estado] || 0) + 1;

    if (m.tipo === 'cheque') {
      chequesCartera += signo * (m.cantidad_cheques || 1);
    }
  }

  return {
    apertura,
    saldos,
    chequesCartera,
    totalOperaciones: movRes.rows.length,
    totalesPorMoneda,
    totalesPorTipo,
    totalesPorEstado,
    movimientos: movRes.rows,
  };
}

module.exports = { calcularSaldosEsperados, FIAT };
