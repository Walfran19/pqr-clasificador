const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

const dbPath = process.env.DB_PATH || path.join(__dirname, "../../database.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

function inicializar() {
  // Tabla principal de PQR
  db.exec(`
    CREATE TABLE IF NOT EXISTS pqr (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo       TEXT UNIQUE NOT NULL,
      texto        TEXT NOT NULL,
      nombre       TEXT NOT NULL,
      cedula       TEXT,
      email        TEXT NOT NULL,
      tipo         TEXT,
      categoria    TEXT,
      prioridad    TEXT,
      sentimiento  TEXT,
      area         TEXT,
      resumen      TEXT,
      respuesta    TEXT,
      confianza    REAL,
      usuario_id   INTEGER,
      estado       TEXT DEFAULT 'Recibida',
      fecha        TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // Migraciones para bases de datos existentes
  try { db.exec("ALTER TABLE pqr ADD COLUMN respuesta TEXT"); } catch {}
  try { db.exec("ALTER TABLE pqr ADD COLUMN usuario_id INTEGER"); } catch {}
  try { db.exec("ALTER TABLE pqr ADD COLUMN cedula TEXT"); } catch {}
  try { db.exec("ALTER TABLE pqr ADD COLUMN respuesta_aprobada INTEGER DEFAULT 0"); } catch {}

  // Tabla de usuarios (admin y usuarios regulares)
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre   TEXT NOT NULL,
      cedula   TEXT,
      email    TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol      TEXT DEFAULT 'user'
    )
  `);
  try { db.exec("ALTER TABLE usuarios ADD COLUMN cedula TEXT"); } catch {}

  // Tabla de conversaciones WhatsApp (estado por número de teléfono)
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversaciones_wa (
      phone                TEXT PRIMARY KEY,
      paso                 TEXT DEFAULT 'nombre',
      nombre               TEXT,
      cedula               TEXT,
      email                TEXT,
      ultimo_codigo        TEXT,
      ultima_clasificacion TEXT,
      updated_at           TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // Tabla de conversaciones Telegram (estado por chat_id)
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversaciones_tg (
      chat_id              TEXT PRIMARY KEY,
      paso                 TEXT DEFAULT 'nombre',
      nombre               TEXT,
      cedula               TEXT,
      email                TEXT,
      ultimo_codigo        TEXT,
      ultima_clasificacion TEXT,
      updated_at           TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // Índices para mejorar rendimiento en consultas frecuentes
  db.exec("CREATE INDEX IF NOT EXISTS idx_pqr_codigo    ON pqr(codigo)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_pqr_cedula    ON pqr(cedula)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_pqr_usuario   ON pqr(usuario_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_pqr_estado    ON pqr(estado)");

  // Crear admin por defecto si no existe ningún admin
  const adminExiste = db.prepare("SELECT id FROM usuarios WHERE rol = 'admin'").get();
  if (!adminExiste) {
    const adminEmail    = process.env.ADMIN_EMAIL    || "admin@pqr.edu.co";
    const adminPassword = process.env.ADMIN_PASSWORD || generarPasswordSeguro();
    const hash = bcrypt.hashSync(adminPassword, 10);
    db.prepare("INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)").run(
      "Administrador", adminEmail, hash, "admin"
    );
    console.log(`\n[INFO] Admin creado — email: ${adminEmail} / password: ${adminPassword}`);
    if (!process.env.ADMIN_PASSWORD) {
      console.log("[INFO] Contraseña generada automáticamente. Configura ADMIN_EMAIL y ADMIN_PASSWORD en .env para establecer tus propias credenciales.\n");
    }
  }
}

function generarPasswordSeguro() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

module.exports = { db, inicializar };