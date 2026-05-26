const { db } = require("../models/database");
const { clasificarPQR } = require("../services/classifier.service");
const { generarCodigo } = require("../services/codigo.service");

// POST /api/pqr — radicar y clasificar
async function radicar(req, res) {
  const { texto, nombre, email } = req.body;

  if (!texto || !nombre || !email) {
    return res.status(400).json({ ok: false, error: "Los campos texto, nombre y email son requeridos." });
  }

  try {
    const clasificacion = await clasificarPQR(texto);
    const codigo = generarCodigo();

    db.prepare(`
      INSERT INTO pqr (codigo, texto, nombre, email, tipo, categoria, prioridad, sentimiento, area, resumen, confianza)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      codigo, texto, nombre, email,
      clasificacion.tipo,
      clasificacion.categoria,
      clasificacion.prioridad,
      clasificacion.sentimiento,
      clasificacion.area_responsable,
      clasificacion.resumen,
      clasificacion.confianza
    );

    res.json({ ok: true, codigo, clasificacion });

  } catch (error) {
    console.error("Error al radicar PQR:", error.message);
    res.status(500).json({ ok: false, error: "Error al procesar la PQR." });
  }
}

// GET /api/pqr/:codigo — consultar por código
function consultar(req, res) {
  const { codigo } = req.params;
  const pqr = db.prepare("SELECT * FROM pqr WHERE codigo = ?").get(codigo.toUpperCase());

  if (!pqr) {
    return res.status(404).json({ ok: false, error: "No se encontró una PQR con ese código." });
  }

  res.json({ ok: true, pqr });
}

// GET /api/pqr/admin/listar — listar todas (admin)
function listar(req, res) {
  const { estado, categoria, prioridad } = req.query;

  let query = "SELECT * FROM pqr WHERE 1=1";
  const params = [];

  if (estado)    { query += " AND estado = ?";    params.push(estado); }
  if (categoria) { query += " AND categoria = ?"; params.push(categoria); }
  if (prioridad) { query += " AND prioridad = ?"; params.push(prioridad); }

  query += " ORDER BY CASE prioridad WHEN 'Alta' THEN 1 WHEN 'Media' THEN 2 ELSE 3 END, fecha DESC";

  const pqrs = db.prepare(query).all(...params);
  res.json({ ok: true, pqrs, total: pqrs.length });
}

// PUT /api/pqr/:codigo/estado — cambiar estado (admin)
function cambiarEstado(req, res) {
  const { codigo } = req.params;
  const { estado } = req.body;

  const estadosValidos = ["Recibida", "En proceso", "Cerrada"];
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ ok: false, error: "Estado inválido." });
  }

  const result = db.prepare("UPDATE pqr SET estado = ? WHERE codigo = ?").run(estado, codigo);

  if (result.changes === 0) {
    return res.status(404).json({ ok: false, error: "PQR no encontrada." });
  }

  res.json({ ok: true, mensaje: `Estado actualizado a '${estado}'.` });
}

// GET /api/pqr/admin/stats — métricas para dashboard
function stats(req, res) {
  const total        = db.prepare("SELECT COUNT(*) as n FROM pqr").get().n;
  const porEstado    = db.prepare("SELECT estado, COUNT(*) as n FROM pqr GROUP BY estado").all();
  const porCategoria = db.prepare("SELECT categoria, COUNT(*) as n FROM pqr GROUP BY categoria").all();
  const porPrioridad = db.prepare("SELECT prioridad, COUNT(*) as n FROM pqr GROUP BY prioridad").all();

  res.json({ ok: true, total, porEstado, porCategoria, porPrioridad });
}

module.exports = { radicar, consultar, listar, cambiarEstado, stats };