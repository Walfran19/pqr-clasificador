require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { inicializar } = require("./src/models/database");

const app = express();
app.use(cors());
app.use(express.json());

// Inicializar base de datos
inicializar();

// Iniciar WhatsApp (sin bloquear el servidor)
if (process.env.WHATSAPP_ENABLED !== "false") {
  const { iniciarWhatsApp } = require("./src/services/whatsapp.service");
  const { manejarMensajeWA }  = require("./src/services/wa-flow.service");
  iniciarWhatsApp(manejarMensajeWA).catch(err =>
    console.error("[WhatsApp] Error al iniciar:", err.message)
  );
}

// Rutas
app.use("/api/pqr",  require("./src/routes/pqr.routes"));
app.use("/api/auth", require("./src/routes/auth.routes"));

app.get("/", (req, res) => res.json({ mensaje: "API PQR activa ✓" }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));