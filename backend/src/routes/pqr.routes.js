const rateLimit = require("express-rate-limit");
const router = require("express").Router();
const { radicar, consultar, consultarPorCedula, listar, cambiarEstado, stats, historial, actualizarRespuesta, aprobarRespuesta } = require("../controllers/pqr.controller");
const { verificarToken, verificarTokenOpcional, verificarAdmin } = require("../controllers/auth.controller");

const limiterRadicar = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Límite de radicaciones alcanzado. Intenta de nuevo en 15 minutos." },
});

// Rutas admin (deben ir antes de /:codigo para evitar conflictos)
router.get("/admin/stats",          verificarToken, verificarAdmin, stats);
router.get("/admin/listar",         verificarToken, verificarAdmin, listar);
router.put("/:codigo/estado",       verificarToken, verificarAdmin, cambiarEstado);
router.put("/:codigo/respuesta",    verificarToken, verificarAdmin, actualizarRespuesta);
router.put("/:codigo/aprobar",      verificarToken, verificarAdmin, aprobarRespuesta);

// Ruta de historial del usuario autenticado
router.get("/user/historial",  verificarToken, historial);

// Consulta pública por cédula
router.get("/cedula/:cedula",  consultarPorCedula);

// Rutas públicas (radicar acepta token opcional para asociar al usuario)
router.post("/",               limiterRadicar, verificarTokenOpcional, radicar);
router.get("/:codigo",         consultar);

module.exports = router;