const path = require("path");
const fs   = require("fs");

let sock      = null;
let baileysMod = null;

async function cargarBaileys() {
  if (!baileysMod) baileysMod = await import("@whiskeysockets/baileys");
  return baileysMod;
}

async function iniciarWhatsApp(onMensaje) {
  const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
  } = await cargarBaileys();

  const AUTH_DIR = path.join(__dirname, "../../wa-auth");

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    auth: state,
    browser: ["Sistema PQR", "Chrome", "1.0"],
    syncFullHistory: false,
    markOnlineOnConnect: false,
    getMessage: async () => ({ conversation: "" }),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      // Mostrar QR en terminal manualmente
      try {
        const qrcode = require("qrcode-terminal");
        console.log("\n[WhatsApp] Escanea este QR con tu celular (WhatsApp → Dispositivos vinculados):\n");
        qrcode.generate(qr, { small: true });
      } catch {
        console.log("[WhatsApp] QR (pega en https://qr.io para verlo):", qr.slice(0, 60) + "...");
      }
    }
    if (connection === "close") {
      const status = lastDisconnect?.error?.output?.statusCode;
      const reconectar = status !== DisconnectReason.loggedOut;
      console.log(`[WhatsApp] Conexión cerrada (código ${status}). Reconectar: ${reconectar}`);
      if (!reconectar) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      }
      setTimeout(() => iniciarWhatsApp(onMensaje), 5000);
    } else if (connection === "open") {
      console.log("[WhatsApp] ✓ Conectado correctamente");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (msg.key.fromMe || !msg.message) continue;
      if (msg.key.remoteJid === "status@broadcast") continue;
      try {
        await onMensaje(msg);
      } catch (err) {
        console.error("[WhatsApp] Error procesando mensaje:", err.message);
      }
    }
  });
}

async function enviarMensaje(phone, texto) {
  if (!sock) {
    console.log("[WhatsApp] Sin conexión — mensaje omitido");
    return;
  }
  const jid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;
  try {
    await sock.sendMessage(jid, { text: texto });
  } catch (err) {
    console.error("[WhatsApp] Error enviando mensaje:", err.message);
  }
}

async function descargarAudio(msg) {
  const { downloadContentFromMessage } = await cargarBaileys();
  const audioMsg = msg.message?.audioMessage || msg.message?.pttMessage;
  if (!audioMsg) return null;

  const stream = await downloadContentFromMessage(audioMsg, "audio");
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function obtenerTextoMensaje(msg) {
  const m = msg.message;
  return (
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.buttonsResponseMessage?.selectedDisplayText ||
    m?.listResponseMessage?.title ||
    ""
  );
}

function esMensajeAudio(msg) {
  return !!(msg.message?.audioMessage || msg.message?.pttMessage);
}

module.exports = { iniciarWhatsApp, enviarMensaje, descargarAudio, obtenerTextoMensaje, esMensajeAudio };
