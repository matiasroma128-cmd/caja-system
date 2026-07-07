const express = require('express');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const pool = require('../db');
const { requiereRol } = require('../middleware/auth');

const router = express.Router();

// Listar cierres, con filtro opcional por fecha (desde/hasta)
router.get('/', async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    const condiciones = [];
    const valores = [];
    if (desde) { valores.push(desde); condiciones.push(`c.fecha >= $${valores.length}`); }
    if (hasta) { valores.push(hasta); condiciones.push(`c.fecha <= $${valores.length}`); }
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT c.id, c.fecha, c.hora_cierre, c.total_operaciones, c.bloqueado,
              u.nombre AS usuario_cierre, c.diferencias_json
       FROM cierres c JOIN usuarios u ON u.id = c.usuario_id
       ${where}
       ORDER BY c.fecha DESC`,
      valores
    );
    res.json({ cierres: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar el historial.' });
  }
});

async function obtenerDetalleCierre(id) {
  const cierreRes = await pool.query(
    `SELECT c.*, u.nombre AS usuario_cierre
     FROM cierres c JOIN usuarios u ON u.id = c.usuario_id
     WHERE c.id = $1`,
    [id]
  );
  if (cierreRes.rows.length === 0) return null;
  const cierre = cierreRes.rows[0];

  const aperturaRes = await pool.query(
    `SELECT a.*, u.nombre AS usuario_apertura
     FROM aperturas a JOIN usuarios u ON u.id = a.usuario_id
     WHERE a.id = $1`,
    [cierre.apertura_id]
  );
  const apertura = aperturaRes.rows[0];

  const criptoRes = await pool.query(
    'SELECT moneda, saldo_inicial FROM saldos_cripto_apertura WHERE apertura_id = $1',
    [cierre.apertura_id]
  );

  const movRes = await pool.query(
    `SELECT m.*, u.nombre AS usuario_nombre
     FROM movimientos m JOIN usuarios u ON u.id = m.usuario_id
     WHERE m.apertura_id = $1 ORDER BY m.fecha_hora ASC`,
    [cierre.apertura_id]
  );

  const auditoriaRes = await pool.query(
    `SELECT au.*, u.nombre AS usuario_nombre
     FROM auditoria au JOIN usuarios u ON u.id = au.usuario_id
     WHERE au.cierre_id = $1 ORDER BY au.fecha_hora ASC`,
    [id]
  );

  return { cierre, apertura, saldosCriptoApertura: criptoRes.rows, movimientos: movRes.rows, auditoria: auditoriaRes.rows };
}

router.get('/:id', async (req, res) => {
  try {
    const detalle = await obtenerDetalleCierre(req.params.id);
    if (!detalle) return res.status(404).json({ error: 'Cierre no encontrado.' });
    res.json(detalle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el detalle del cierre.' });
  }
});

// Reabrir un cierre (solo administrador) — queda registrado en auditoría
router.post('/:id/reabrir', requiereRol('administrador'), async (req, res) => {
  const { motivo = '' } = req.body;
  const client = await pool.connect();
  try {
    const cierreRes = await client.query('SELECT * FROM cierres WHERE id = $1', [req.params.id]);
    if (cierreRes.rows.length === 0) return res.status(404).json({ error: 'Cierre no encontrado.' });
    const cierre = cierreRes.rows[0];

    await client.query('BEGIN');
    await client.query("UPDATE aperturas SET estado = 'abierta' WHERE id = $1", [cierre.apertura_id]);
    await client.query('UPDATE cierres SET bloqueado = FALSE WHERE id = $1', [cierre.id]);
    await client.query(
      `INSERT INTO auditoria (cierre_id, usuario_id, accion, campo_modificado, valor_anterior, valor_nuevo)
       VALUES ($1, $2, 'reapertura', 'estado_apertura', 'cerrada', 'abierta')`,
      [cierre.id, req.usuario.id]
    );
    if (motivo) {
      await client.query(
        `INSERT INTO auditoria (cierre_id, usuario_id, accion, campo_modificado, valor_anterior, valor_nuevo)
         VALUES ($1, $2, 'reapertura', 'motivo', '', $3)`,
        [cierre.id, req.usuario.id, motivo]
      );
    }
    await client.query('COMMIT');
    res.json({ mensaje: 'Cierre reabierto correctamente.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al reabrir el cierre.' });
  } finally {
    client.release();
  }
});

// Exportar a CSV (para abrir en Excel)
router.get('/:id/exportar/csv', async (req, res) => {
  try {
    const detalle = await obtenerDetalleCierre(req.params.id);
    if (!detalle) return res.status(404).json({ error: 'Cierre no encontrado.' });

    const filas = detalle.movimientos.map((m) => ({
      fecha_hora: m.fecha_hora,
      tipo: m.tipo,
      direccion: m.direccion,
      moneda: m.moneda,
      monto: m.monto,
      estado: m.estado,
      usuario: m.usuario_nombre,
      descripcion: m.descripcion,
    }));

    const parser = new Parser();
    const csv = parser.parse(filas.length ? filas : [{ info: 'Sin movimientos registrados' }]);

    res.header('Content-Type', 'text/csv');
    res.attachment(`cierre_${detalle.cierre.fecha}.csv`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al exportar a CSV.' });
  }
});

// Exportar a PDF
router.get('/:id/exportar/pdf', async (req, res) => {
  try {
    const detalle = await obtenerDetalleCierre(req.params.id);
    if (!detalle) return res.status(404).json({ error: 'Cierre no encontrado.' });

    const { cierre, apertura, movimientos } = detalle;

    res.header('Content-Type', 'application/pdf');
    res.attachment(`cierre_${cierre.fecha}.pdf`);

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(18).text('Cierre de Caja Diario', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10)
      .text(`Fecha: ${cierre.fecha}`)
      .text(`Hora de cierre: ${cierre.hora_cierre}`)
      .text(`Usuario: ${cierre.usuario_cierre}`)
      .text(`Total de operaciones: ${cierre.total_operaciones}`);
    doc.moveDown();

    doc.fontSize(13).text('Totales por moneda', { underline: true });
    doc.fontSize(10);
    const totales = cierre.totales_json.porMoneda || {};
    Object.entries(totales).forEach(([moneda, total]) => {
      doc.text(`${moneda}: ${total}`);
    });
    doc.moveDown();

    doc.fontSize(13).text('Diferencias de arqueo', { underline: true });
    doc.fontSize(10);
    Object.entries(cierre.diferencias_json).forEach(([moneda, d]) => {
      doc.text(`${moneda} — esperado: ${d.esperado} | contado: ${d.contado} | diferencia: ${d.diferencia} (${d.estado})`);
    });
    doc.moveDown();

    doc.fontSize(13).text('Movimientos del día', { underline: true });
    doc.fontSize(9);
    movimientos.forEach((m) => {
      doc.text(`${m.fecha_hora}  ${m.tipo.toUpperCase()}  ${m.direccion}  ${m.moneda} ${m.monto}  [${m.estado}]  ${m.descripcion || ''}`);
    });

    if (cierre.observaciones) {
      doc.moveDown();
      doc.fontSize(13).text('Observaciones', { underline: true });
      doc.fontSize(10).text(cierre.observaciones);
    }

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar el PDF.' });
  }
});

module.exports = router;
