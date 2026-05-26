const { db } = require("../models/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "pqr_secret_2026";

function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "Email y contraseña requeridos." });
  }

  const usuario = db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email);

  if (!usuario || !bcrypt.compareSync(password, usuario.password)) {
    return res.status(401).json({ ok: false, error: "Credenciales incorrectas." });
  }

  const token = jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol },
    SECRET,
    { expiresIn: "8h" }
  );

  res.json({
    ok: true,
    token,
    usuario: { nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
  });
}

// Middleware para proteger rutas de admin
function verificarToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "Token requerido." });
  }

  try {
    const token = auth.split(" ")[1];
    req.usuario = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ ok: false, error: "Token inválido o expirado." });
  }
}

module.exports = { login, verificarToken };