const fs   = require("fs");
const path = require("path");
const os   = require("os");

let groqClient = null;

function getGroq() {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY no configurada en .env");
    const Groq = require("groq-sdk");
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

async function transcribirAudio(buffer) {
  const tmpFile = path.join(os.tmpdir(), `pqr-audio-${Date.now()}.ogg`);
  fs.writeFileSync(tmpFile, buffer);

  try {
    const res = await getGroq().audio.transcriptions.create({
      file:            fs.createReadStream(tmpFile),
      model:           "whisper-large-v3-turbo",
      language:        "es",
      response_format: "text",
    });
    return (typeof res === "string" ? res : res.text || "").trim();
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

module.exports = { transcribirAudio };
