const { db } = require("../models/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

if (!process.env.JWT_SECRET) {
  console.warn("[WARN] JWT_SECRET no está configurado. Usando clave insegura por defecto. Configura JWT_SECRET en el archivo .env");
}
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
    usuario: { id: usuario.id, nombre: usuario.nombre, cedula: usuario.cedula || null, email: usuario.email, rol: usuario.rol }
  });
}

function register(req, res) {
  const { nombre, cedula, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ ok: false, error: "Nombre, email y contraseña son requeridos." });
  }

  if (password.length < 6) {
    return res.status(400).json({ ok: false, error: "La contraseña debe tener al menos 6 caracteres." });
  }

  const existe = db.prepare("SELECT id FROM usuarios WHERE email = ?").get(email);
  if (existe) {
    return res.status(409).json({ ok: false, error: "Ya existe una cuenta con ese correo." });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    "INSERT INTO usuarios (nombre, cedula, email, password, rol) VALUES (?, ?, ?, ?, 'user')"
  ).run(nombre, cedula || null, email, hash);

  const token = jwt.sign(
    { id: result.lastInsertRowid, email, rol: "user" },
    SECRET,
    { expiresIn: "8h" }
  );

  res.status(201).json({
    ok: true,
    token,
    usuario: { id: result.lastInsertRowid, nombre, cedula: cedula || null, email, rol: "user" }
  });
}

// Middleware para rutas que requieren admin
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

// Middleware para rutas que funcionan con o sin autenticación
function verificarTokenOpcional(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    try {
      req.usuario = jwt.verify(auth.split(" ")[1], SECRET);
    } catch {}
  }
  next();
}

function verificarAdmin(req, res, next) {
  if (req.usuario?.rol !== "admin") {
    return res.status(403).json({ ok: false, error: "Acceso restringido a administradores." });
  }
  next();
}

module.exports = { login, register, verificarToken, verificarTokenOpcional, verificarAdmin };