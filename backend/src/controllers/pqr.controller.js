const { db } = require("../models/database");
const { clasificarPQR } = require("../services/classifier.service");
const { generarCodigo } = require("../services/codigo.service");
const { enviarConfirmacionRadicacion, enviarCambioEstado, enviarRespuestaDisponible } = require("../services/email.service");
const { notificarCambioEstado, notificarRespuesta } = require("../services/wa-flow.service");
const { notificarCambioEstadoTG, notificarRespuestaTG } = require("../services/telegram-flow.service");

// POST /api/pqr — radicar y clasificar
async function radicar(req, res) {
  const { texto, nombre, cedula, email } = req.body;

  if (!texto || !nombre || !email) {
    return res.status(400).json({ ok: false, error: "Los campos texto, nombre y email son requeridos." });
  }

  if (texto.length > 5000) {
    return res.status(400).json({ ok: false, error: "El texto no puede superar los 5000 caracteres." });
  }

  try {
    const clasificacion = await clasificarPQR(texto);
    const codigo = generarCodigo();
    const usuario_id = req.usuario?.id || null;

    db.prepare(`
      INSERT INTO pqr (codigo, texto, nombre, cedula, email, tipo, categoria, prioridad, sentimiento, area, resumen, respuesta, confianza, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      codigo, texto, nombre, cedula || null, email,
      clasificacion.tipo,
      clasificacion.categoria,
      clasificacion.prioridad,
      clasificacion.sentimiento,
      clasificacion.area_responsable,
      clasificacion.resumen,
      clasificacion.respuesta || null,
      clasificacion.confianza,
      usuario_id
    );

    res.json({ ok: true, codigo, clasificacion });

    // Fire-and-forget: no bloquea la respuesta
    enviarConfirmacionRadicacion(nombre, email, codigo, clasificacion).catch(() => {});

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

// GET /api/pqr/admin/listar — listar con filtros y paginación (admin)
function listar(req, res) {
  const { estado, categoria, prioridad } = req.query;
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  let condicion = "WHERE 1=1";
  const params = [];

  if (estado)    { condicion += " AND estado = ?";    params.push(estado); }
  if (categoria) { condicion += " AND categoria = ?"; params.push(categoria); }
  if (prioridad) { condicion += " AND prioridad = ?"; params.push(prioridad); }

  const orden = " ORDER BY CASE prioridad WHEN 'Alta' THEN 1 WHEN 'Media' THEN 2 ELSE 3 END, fecha DESC";

  const total = db.prepare(`SELECT COUNT(*) as n FROM pqr ${condicion}`).get(...params).n;
  const pqrs  = db.prepare(`SELECT * FROM pqr ${condicion}${orden} LIMIT ? OFFSET ?`).all(...params, limit, offset);

  res.json({ ok: true, pqrs, total, page, limit, totalPages: Math.ceil(total / limit) });
}

// PUT /api/pqr/:codigo/estado — cambiar estado (admin)
function cambiarEstado(req, res) {
  const { codigo } = req.params;
  const { estado } = req.body;

  const estadosValidos = ["Recibida", "En proceso", "Cerrada"];
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ ok: false, error: "Estado inválido." });
  }

  const pqr = db.prepare("SELECT nombre, email FROM pqr WHERE codigo = ?").get(codigo.toUpperCase());
  if (!pqr) {
    return res.status(404).json({ ok: false, error: "PQR no encontrada." });
  }

  db.prepare("UPDATE pqr SET estado = ? WHERE codigo = ?").run(estado, codigo.toUpperCase());

  res.json({ ok: true, mensaje: `Estado actualizado a '${estado}'.` });

  // Fire-and-forget: no bloquea la respuesta
  enviarCambioEstado(pqr.nombre, pqr.email, codigo.toUpperCase(), estado).catch(() => {});
  notificarCambioEstado(pqr.email, codigo.toUpperCase(), estado).catch(() => {});
  notificarCambioEstadoTG(pqr.email, codigo.toUpperCase(), estado).catch(() => {});
}

// GET /api/pqr/admin/stats — métricas para dashboard
function stats(req, res) {
  const total        = db.prepare("SELECT COUNT(*) as n FROM pqr").get().n;
  const porEstado    = db.prepare("SELECT estado, COUNT(*) as n FROM pqr GROUP BY estado").all();
  const porCategoria = db.prepare("SELECT categoria, COUNT(*) as n FROM pqr GROUP BY categoria").all();
  const porPrioridad = db.prepare("SELECT prioridad, COUNT(*) as n FROM pqr GROUP BY prioridad").all();
  const porDia       = db.prepare(`
    SELECT DATE(fecha) as dia, COUNT(*) as n
    FROM pqr
    WHERE fecha >= datetime('now', '-29 days')
    GROUP BY DATE(fecha)
    ORDER BY dia
  `).all();
  const sinRespuesta = db.prepare(
    "SELECT COUNT(*) as n FROM pqr WHERE respuesta_aprobada = 0 OR respuesta_aprobada IS NULL"
  ).get().n;
  const recientes = db.prepare(
    "SELECT codigo, nombre, categoria, prioridad, estado, fecha FROM pqr ORDER BY fecha DESC LIMIT 6"
  ).all();

  res.json({ ok: true, total, porEstado, porCategoria, porPrioridad, porDia, sinRespuesta, recientes });
}

// GET /api/pqr/cedula/:cedula — consultar todos los casos de una cédula
function consultarPorCedula(req, res) {
  const { cedula } = req.params;
  const pqrs = db.prepare(
    "SELECT * FROM pqr WHERE cedula = ? ORDER BY fecha DESC"
  ).all(cedula.trim());

  if (pqrs.length === 0) {
    return res.status(404).json({ ok: false, error: "No se encontraron casos para esa cédula." });
  }

  res.json({ ok: true, pqrs, total: pqrs.length });
}

// GET /api/pqr/email/:email — verificar si un correo tiene casos registrados
function consultarPorEmail(req, res) {
  const email = req.params.email.trim().toLowerCase();
  const pqrs = db.prepare(
    "SELECT codigo, tipo, categoria, estado, fecha FROM pqr WHERE LOWER(email) = ? ORDER BY fecha DESC LIMIT 5"
  ).all(email);

  res.json({ ok: true, pqrs, total: pqrs.length });
}

// GET /api/pqr/user/historial — historial del usuario autenticado
function historial(req, res) {
  const pqrs = db.prepare(
    "SELECT * FROM pqr WHERE usuario_id = ? ORDER BY fecha DESC"
  ).all(req.usuario.id);
  res.json({ ok: true, pqrs, total: pqrs.length });
}

// PUT /api/pqr/:codigo/respuesta — admin escribe o edita la respuesta
function actualizarRespuesta(req, res) {
  const { codigo } = req.params;
  const { respuesta } = req.body;

  if (!respuesta || !respuesta.trim()) {
    return res.status(400).json({ ok: false, error: "La respuesta no puede estar vacía." });
  }

  const pqr = db.prepare("SELECT nombre, email FROM pqr WHERE codigo = ?").get(codigo.toUpperCase());
  if (!pqr) {
    return res.status(404).json({ ok: false, error: "PQR no encontrada." });
  }

  db.prepare(
    "UPDATE pqr SET respuesta = ?, respuesta_aprobada = 1 WHERE codigo = ?"
  ).run(respuesta.trim(), codigo.toUpperCase());

  res.json({ ok: true, mensaje: "Respuesta actualizada y aprobada." });

  // Fire-and-forget: no bloquea la respuesta
  enviarRespuestaDisponible(pqr.nombre, pqr.email, codigo.toUpperCase(), respuesta.trim()).catch(() => {});
  notificarRespuesta(pqr.email, codigo.toUpperCase(), respuesta.trim()).catch(() => {});
  notificarRespuestaTG(pqr.email, codigo.toUpperCase(), respuesta.trim()).catch(() => {});
}

// PUT /api/pqr/:codigo/aprobar — admin aprueba la respuesta generada por IA
function aprobarRespuesta(req, res) {
  const { codigo } = req.params;

  const pqr = db.prepare("SELECT nombre, email, respuesta FROM pqr WHERE codigo = ?").get(codigo.toUpperCase());
  if (!pqr) {
    return res.status(404).json({ ok: false, error: "PQR no encontrada." });
  }

  db.prepare("UPDATE pqr SET respuesta_aprobada = 1 WHERE codigo = ?").run(codigo.toUpperCase());

  res.json({ ok: true, mensaje: "Respuesta de la IA aprobada." });

  // Fire-and-forget: no bloquea la respuesta
  if (pqr.respuesta) {
    enviarRespuestaDisponible(pqr.nombre, pqr.email, codigo.toUpperCase(), pqr.respuesta).catch(() => {});
    notificarRespuesta(pqr.email, codigo.toUpperCase(), pqr.respuesta).catch(() => {});
    notificarRespuestaTG(pqr.email, codigo.toUpperCase(), pqr.respuesta).catch(() => {});
  }
}

module.exports = { radicar, consultar, consultarPorCedula, consultarPorEmail, listar, cambiarEstado, stats, historial, actualizarRespuesta, aprobarRespuesta };