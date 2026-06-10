const { Pool, types } = require("pg");
const bcrypt = require("bcryptjs");

// COUNT(*) y otros bigint llegan como string desde pg; los devolvemos como number
types.setTypeParser(20, (val) => parseInt(val, 10));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
});

// Convierte placeholders estilo SQLite (?) a placeholders de Postgres ($1, $2, ...)
function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// Wrapper compatible con la interfaz db.prepare(sql).get/all/run(...) de better-sqlite3
const db = {
  pool,
  prepare(sql) {
    const text = toPg(sql);
    return {
      get: async (...params) => (await pool.query(text, params)).rows[0],
      all: async (...params) => (await pool.query(text, params)).rows,
      run: async (...params) => {
        const { rows, rowCount } = await pool.query(text, params);
        return { changes: rowCount, lastInsertRowid: rows[0]?.id };
      },
    };
  },
  async exec(sql) {
    await pool.query(sql);
  },
};

// Expresión de timestamp "ahora" en hora de Colombia, formateada como texto
const NOW_BOGOTA = "TO_CHAR(NOW() AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD HH24:MI:SS')";

async function inicializar() {
  // Tabla principal de PQR
  await db.exec(`
    CREATE TABLE IF NOT EXISTS pqr (
      id           SERIAL PRIMARY KEY,
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
      respuesta_aprobada INTEGER DEFAULT 0,
      fecha        TEXT DEFAULT ${NOW_BOGOTA}
    )
  `);

  // Migraciones para bases de datos existentes
  await db.exec("ALTER TABLE pqr ADD COLUMN IF NOT EXISTS respuesta TEXT");
  await db.exec("ALTER TABLE pqr ADD COLUMN IF NOT EXISTS usuario_id INTEGER");
  await db.exec("ALTER TABLE pqr ADD COLUMN IF NOT EXISTS cedula TEXT");
  await db.exec("ALTER TABLE pqr ADD COLUMN IF NOT EXISTS respuesta_aprobada INTEGER DEFAULT 0");

  // Tabla de usuarios (admin y usuarios regulares)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id       SERIAL PRIMARY KEY,
      nombre   TEXT NOT NULL,
      cedula   TEXT,
      email    TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol      TEXT DEFAULT 'user'
    )
  `);
  await db.exec("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cedula TEXT");

  // Tabla de conversaciones WhatsApp (estado por número de teléfono)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS conversaciones_wa (
      phone                TEXT PRIMARY KEY,
      paso                 TEXT DEFAULT 'nombre',
      nombre               TEXT,
      cedula               TEXT,
      email                TEXT,
      ultimo_codigo        TEXT,
      ultima_clasificacion TEXT,
      updated_at           TEXT DEFAULT ${NOW_BOGOTA}
    )
  `);

  // Tabla de conversaciones Telegram (estado por chat_id)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS conversaciones_tg (
      chat_id              TEXT PRIMARY KEY,
      paso                 TEXT DEFAULT 'nombre',
      nombre               TEXT,
      cedula               TEXT,
      email                TEXT,
      ultimo_codigo        TEXT,
      ultima_clasificacion TEXT,
      updated_at           TEXT DEFAULT ${NOW_BOGOTA}
    )
  `);

  // Índices para mejorar rendimiento en consultas frecuentes
  await db.exec("CREATE INDEX IF NOT EXISTS idx_pqr_codigo    ON pqr(codigo)");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_pqr_cedula    ON pqr(cedula)");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_pqr_usuario   ON pqr(usuario_id)");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_pqr_estado    ON pqr(estado)");

  // Crear admin por defecto si no existe ningún admin
  const adminExiste = await db.prepare("SELECT id FROM usuarios WHERE rol = 'admin'").get();
  if (!adminExiste) {
    const adminEmail    = process.env.ADMIN_EMAIL    || "admin@pqr.edu.co";
    const adminPassword = process.env.ADMIN_PASSWORD || generarPasswordSeguro();
    const hash = bcrypt.hashSync(adminPassword, 10);
    await db.prepare("INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)").run(
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
