const router = require("express").Router();
const { radicar, consultar, listar, cambiarEstado, stats } = require("../controllers/pqr.controller");
const { verificarToken } = require("../controllers/auth.controller");

// Rutas admin primero (evita conflicto con /:codigo)
router.get("/admin/stats",     verificarToken, stats);
router.get("/admin/listar",    verificarToken, listar);
router.put("/:codigo/estado",  verificarToken, cambiarEstado);

// Rutas públicas
router.post("/",               radicar);
router.get("/:codigo",         consultar);

module.exports = router;