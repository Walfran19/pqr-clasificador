require("dotenv").config();
const app = require("./src/app");
const { inicializar } = require("./src/models/database");

async function main() {
  // Inicializar base de datos
  await inicializar();

  // Iniciar WhatsApp (sin bloquear el servidor)
  if (process.env.WHATSAPP_ENABLED !== "false") {
    const { iniciarWhatsApp } = require("./src/services/whatsapp.service");
    const { manejarMensajeWA }  = require("./src/services/wa-flow.service");
    iniciarWhatsApp(manejarMensajeWA).catch(err =>
      console.error("[WhatsApp] Error al iniciar:", err.message)
    );
  }

  // Iniciar Telegram (sin bloquear el servidor)
  if (process.env.TELEGRAM_ENABLED !== "false") {
    const { iniciarTelegram }   = require("./src/services/telegram.service");
    const { manejarMensajeTG }  = require("./src/services/telegram-flow.service");
    iniciarTelegram(manejarMensajeTG).catch(err =>
      console.error("[Telegram] Error al iniciar:", err.message)
    );
  }

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
}

main().catch(err => {
  console.error("[Fatal] Error al iniciar el servidor:", err.message);
  process.exit(1);
});
