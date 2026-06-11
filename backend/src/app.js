const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Rutas
app.use("/api/pqr", require("./routes/pqr.routes"));
app.use("/api/auth", require("./routes/auth.routes"));

app.get("/", (req, res) => res.json({ mensaje: "API PQR activa ✓" }));

module.exports = app;
