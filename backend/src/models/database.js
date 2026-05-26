const Database = require("better-sqlite3");
const path = require("path");
const bcrypt = require("bcryptjs");

const db = new Database(path.join(__dirname, "../../database.db"));

function inicializar() {
  // Tabla principal de PQR
  db.exec(`
    CREATE TABLE IF NOT EXISTS pqr (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo       TEXT UNIQUE NOT NULL,
      texto        TEXT NOT NULL,
      nombre       TEXT NOT NULL,
      email        TEXT NOT NULL,
      tipo         TEXT,
      categoria    TEXT,
      prioridad    TEXT,
      sentimiento  TEXT,
      area         TEXT,
      resumen      TEXT,
      confianza    REAL,
      estado       TEXT DEFAULT 'Recibida',
      fecha        TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // Tabla de usuarios (solo para el admin)
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre   TEXT NOT NULL,
      email    TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol      TEXT DEFAULT 'admin'
    )
  `);

  // Crear admin por defecto si no existe
  const existe = db.prepare("SELECT id FROM usuarios WHERE email = ?").get("admin@pqr.edu.co");
  if (!existe) {
    const hash = bcrypt.hashSync("admin123", 10);
    db.prepare("INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)").run(
      "Administrador", "admin@pqr.edu.co", hash, "admin"
    );
    console.log("Admin creado — email: admin@pqr.edu.co / password: admin123");
  }
}

module.exports = { db, inicializar };