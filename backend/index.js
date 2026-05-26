require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { inicializar } = require("./src/models/database");

const app = express();
app.use(cors());
app.use(express.json());

// Inicializar base de datos
inicializar();

// Rutas
app.use("/api/pqr",  require("./src/routes/pqr.routes"));
app.use("/api/auth", require("./src/routes/auth.routes"));

app.get("/", (req, res) => res.json({ mensaje: "API PQR activa ✓" }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));