const TelegramBot = require("node-telegram-bot-api");

let bot = null;

async function iniciarTelegram(onMensaje) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("[Telegram] TELEGRAM_BOT_TOKEN no configurado — bot deshabilitado");
    return;
  }

  bot = new TelegramBot(token, { polling: true });

  bot.on("message", async (msg) => {
    try {
      await onMensaje(msg);
    } catch (err) {
      console.error("[Telegram] Error procesando mensaje:", err.message);
    }
  });

  bot.on("polling_error", (err) => {
    console.error("[Telegram] Polling error:", err.message);
  });

  console.log("[Telegram] ✓ Bot iniciado correctamente");
}

async function enviarMensajeTG(chatId, texto) {
  if (!bot) return;
  try {
    await bot.sendMessage(chatId, texto, { parse_mode: "Markdown" });
  } catch {
    // Fallback: enviar sin formato si Markdown falla por caracteres especiales
    try {
      const plano = texto.replace(/[*_`\[\]]/g, "");
      await bot.sendMessage(chatId, plano);
    } catch (err2) {
      console.error("[Telegram] Error enviando mensaje:", err2.message);
    }
  }
}

async function descargarAudioTG(msg) {
  if (!bot) return null;
  const fileId = msg.voice?.file_id || msg.audio?.file_id;
  if (!fileId) return null;
  try {
    const stream = bot.getFileStream(fileId);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
  } catch (err) {
    console.error("[Telegram] Error descargando audio:", err.message);
    return null;
  }
}

function obtenerTextoTG(msg) {
  return msg.text || msg.caption || "";
}

function esMensajeAudioTG(msg) {
  return !!(msg.voice || msg.audio);
}

module.exports = { iniciarTelegram, enviarMensajeTG, descargarAudioTG, obtenerTextoTG, esMensajeAudioTG };
