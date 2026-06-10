const { db }                        = require("../models/database");
const { clasificarPQR }             = require("./classifier.service");
const { generarCodigo }             = require("./codigo.service");
const { enviarConfirmacionRadicacion } = require("./email.service");
const { enviarMensajeTG, descargarAudioTG, obtenerTextoTG, esMensajeAudioTG } = require("./telegram.service");
const { transcribirAudio }          = require("./transcription.service");

const PLAZOS = { Alta: "24 horas", Media: "3 días hábiles", Baja: "5 días hábiles" };
const INACTIVIDAD_HORAS = 24;

// ─── Menú principal ───────────────────────────────────────────────────────────

const MENU_OPCIONES = [
  "¿Qué deseas hacer?",
  "",
  "1️⃣ *Nueva PQR* — Radicar una petición, queja o reclamo",
  "2️⃣ *Consultar PQR* — Ver tus casos ya radicados",
  "",
  "Responde con *1* o *2*."
].join("\n");

const VOLVER_MENU = "0️⃣ Escribe *0* para volver al menú.";
const RE_MENU     = /^men[uú]$/i;

// ─── DB helpers ──────────────────────────────────────────────────────────────

function getConv(chatId) {
  return db.prepare("SELECT * FROM conversaciones_tg WHERE chat_id = ?").get(String(chatId));
}

function saveConv(chatId, campos) {
  const id = String(chatId);
  const existe = db.prepare("SELECT chat_id FROM conversaciones_tg WHERE chat_id = ?").get(id);
  if (existe) {
    const keys = Object.keys(campos);
    const sets = keys.map(k => `${k} = ?`).join(", ");
    db.prepare(`UPDATE conversaciones_tg SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE chat_id = ?`)
      .run(...keys.map(k => campos[k]), id);
  } else {
    db.prepare(`
      INSERT INTO conversaciones_tg (chat_id, paso, nombre, cedula, email, ultimo_codigo, ultima_clasificacion)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      campos.paso ?? "nombre",
      campos.nombre ?? null,
      campos.cedula ?? null,
      campos.email  ?? null,
      campos.ultimo_codigo        ?? null,
      campos.ultima_clasificacion ?? null
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function responder(chatId, ...textos) {
  for (let i = 0; i < textos.length; i++) {
    await enviarMensajeTG(chatId, textos[i]);
    if (i < textos.length - 1) await new Promise(r => setTimeout(r, 600));
  }
}

function estaInactivo(conv) {
  if (!conv?.updated_at) return false;
  const horas = (Date.now() - new Date(conv.updated_at).getTime()) / 3_600_000;
  return horas > INACTIVIDAD_HORAS;
}

// ─── Lógica de followup ───────────────────────────────────────────────────────

function respuestaFollowup(txt, clasificacion, codigo) {
  const t = txt.toLowerCase();

  if (/nuevo\s*caso|otro\s*caso|otra\s*queja|radicar/i.test(t))
    return null;

  if (/cuándo|cuando|tiempo|demora|días|dias|tarda|plazo|esperar/i.test(t))
    return `⏰ Tu caso tiene prioridad *${clasificacion.prioridad}*, tiempo estimado: *${PLAZOS[clasificacion.prioridad] || "5 días hábiles"}*. El área de *${clasificacion.area_responsable}* lo atenderá.`;

  if (/quién|quien|área|area|encarga|responsable/i.test(t))
    return `🏢 Tu caso fue asignado al área de *${clasificacion.area_responsable}*. Responderán en *${PLAZOS[clasificacion.prioridad] || "5 días hábiles"}*.`;

  if (/código|codigo|número|numero|radicado/i.test(t))
    return `📌 Tu código es *${codigo}*. Escribe *CONSULTAR ${codigo}* para ver el estado.`;

  if (/estado|cómo va|como va|novedad/i.test(t)) {
    const pqr = db.prepare("SELECT estado, respuesta FROM pqr WHERE codigo = ?").get(codigo);
    if (pqr) return `📋 Estado de *${codigo}*: *${pqr.estado}*${pqr.respuesta ? "\n\n💬 Respuesta:\n" + pqr.respuesta : ""}`;
  }

  return `Tu caso *${codigo}* está en manos del área de ${clasificacion.area_responsable} (prioridad ${clasificacion.prioridad} — ${PLAZOS[clasificacion.prioridad] || "5 días hábiles"}). ¿Necesitas algo más?\n\nEscribe *nuevo caso* para radicar otra solicitud.`;
}

// ─── Procesador principal ─────────────────────────────────────────────────────

async function procesarMensajeTG(chatId, texto) {
  const txt = texto.trim();
  if (!txt) return;

  // Comando: consultar estado (disponible siempre)
  const matchConsulta = txt.match(/^consultar\s+(PQR-\d{4}-\d{4})$/i);
  if (matchConsulta) {
    const codigo = matchConsulta[1].toUpperCase();
    const pqr = db.prepare("SELECT estado, tipo, categoria, prioridad, respuesta FROM pqr WHERE codigo = ?").get(codigo);
    if (pqr) {
      const resp = pqr.respuesta ? `\n\n💬 *Respuesta:*\n${pqr.respuesta}` : "";
      await responder(chatId, `📋 *Estado del caso ${codigo}*\n\n📌 Estado: *${pqr.estado}*\n🏷️ Tipo: ${pqr.tipo} — ${pqr.categoria}\n⚡ Prioridad: ${pqr.prioridad}${resp}`);
    } else {
      await responder(chatId, `❌ No encontré ningún caso con el código *${codigo}*.`);
    }
    return;
  }

  let conv = getConv(chatId);

  // Usuario completamente nuevo: iniciar con cualquier mensaje
  if (!conv) {
    saveConv(chatId, { paso: "menu", nombre: null, cedula: null, email: null, ultimo_codigo: null, ultima_clasificacion: null });
    await responder(chatId,
      "👋 ¡Bienvenido al sistema de *PQR* de la institución educativa!",
      MENU_OPCIONES
    );
    return;
  }

  // Reiniciar — borrar conversación para exigir el trigger de nuevo
  if (/^(reiniciar|reset|cancelar)$/i.test(txt)) {
    db.prepare("DELETE FROM conversaciones_tg WHERE chat_id = ?").run(String(chatId));
    await responder(chatId, 'Conversación reiniciada. Cuando quieras comenzar escribe:\n\n*Hola, vengo a dejar una PQR*');
    return;
  }

  // Volver al menú principal en cualquier momento
  if (RE_MENU.test(txt) && conv.paso !== "procesando") {
    saveConv(chatId, { paso: "menu" });
    await responder(chatId, MENU_OPCIONES);
    return;
  }

  // Usuario que vuelve después de inactividad → mostrar menú de nuevo
  if (estaInactivo(conv) && conv.paso !== "procesando") {
    saveConv(chatId, { paso: "menu", nombre: null, cedula: null, email: null, ultimo_codigo: null, ultima_clasificacion: null });
    await responder(chatId,
      "👋 ¡Bienvenido de nuevo!",
      MENU_OPCIONES
    );
    return;
  }

  const paso = conv.paso;

  // ── Pasos del flujo ────────────────────────────────────────────────────────

  if (paso === "menu") {
    if (txt === "1") {
      saveConv(chatId, { paso: "nombre", nombre: null, cedula: null, email: null, ultimo_codigo: null, ultima_clasificacion: null });
      await responder(chatId, "📋 Perfecto, vamos a radicar tu PQR. ¿Cuál es tu *nombre completo*?");
      return;
    }
    if (txt === "2") {
      saveConv(chatId, { paso: "consultar_cedula" });
      await responder(chatId,
        "🪪 Escribe tu *número de cédula* para ver tus casos registrados.",
        VOLVER_MENU
      );
      return;
    }
    await responder(chatId, "🤔 No entendí tu respuesta. Responde con *1* o *2*.\n\n" + MENU_OPCIONES);
    return;
  }

  if (paso === "consultar_cedula") {
    if (txt === "0") {
      saveConv(chatId, { paso: "menu" });
      await responder(chatId, MENU_OPCIONES);
      return;
    }

    const cedula = txt.replace(/\s/g, "");
    if (!/^\d{5,12}$/.test(cedula)) {
      await responder(chatId, `❌ Ingresa un número de cédula válido (solo números, entre 5 y 12 dígitos).\n\n${VOLVER_MENU}`);
      return;
    }

    const casos = db.prepare(
      "SELECT codigo, categoria, estado, fecha FROM pqr WHERE cedula = ? ORDER BY fecha DESC LIMIT 9"
    ).all(cedula);

    if (casos.length === 0) {
      await responder(chatId, `❌ No encontré ningún caso registrado con la cédula *${cedula}*.\n\nIntenta con otra cédula, o ${VOLVER_MENU.toLowerCase()}`);
      return;
    }

    const NUMS = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];
    const lista = casos.map((c, i) =>
      `${NUMS[i]} *${c.codigo}* — ${c.categoria} (${c.estado}) — ${(c.fecha || "").slice(0, 10)}`
    ).join("\n");

    saveConv(chatId, {
      paso: "consultar_lista",
      ultima_clasificacion: JSON.stringify(casos.map(c => c.codigo)),
    });

    await responder(chatId,
      `📋 Encontré *${casos.length}* caso(s) con la cédula *${cedula}*:\n\n${lista}`,
      `Escribe el número del caso que deseas ver.\n\n${VOLVER_MENU}`
    );
    return;
  }

  if (paso === "consultar_lista") {
    if (txt === "0") {
      saveConv(chatId, { paso: "menu", ultima_clasificacion: null });
      await responder(chatId, MENU_OPCIONES);
      return;
    }

    let codigos = [];
    try { codigos = JSON.parse(conv.ultima_clasificacion || "[]"); } catch {}

    const idx = parseInt(txt, 10);
    if (!Number.isInteger(idx) || idx < 1 || idx > codigos.length) {
      await responder(chatId, `❌ Elige un número entre *1* y *${codigos.length}*.\n\n${VOLVER_MENU}`);
      return;
    }

    const codigo = codigos[idx - 1];
    const pqr = db.prepare("SELECT estado, tipo, categoria, prioridad, respuesta FROM pqr WHERE codigo = ?").get(codigo);

    if (pqr) {
      const resp = pqr.respuesta ? `\n\n💬 *Respuesta:*\n${pqr.respuesta}` : "";
      await responder(chatId, `📋 *Estado del caso ${codigo}*\n\n📌 Estado: *${pqr.estado}*\n🏷️ Tipo: ${pqr.tipo} — ${pqr.categoria}\n⚡ Prioridad: ${pqr.prioridad}${resp}`);
    } else {
      await responder(chatId, `❌ No encontré información del caso *${codigo}*.`);
    }

    saveConv(chatId, { paso: "menu", ultima_clasificacion: null });
    await responder(chatId, MENU_OPCIONES);
    return;
  }

  if (paso === "nombre") {
    if (txt.length < 3) {
      await responder(chatId, "⚠️ Por favor ingresa tu nombre completo.");
      return;
    }
    saveConv(chatId, { paso: "cedula", nombre: txt });
    await responder(chatId,
      `Gracias, *${txt}*. 👋`,
      "🪪 Ahora ingresa tu *número de cédula* (solo números)."
    );
    return;
  }

  if (paso === "cedula") {
    if (!/^\d{5,12}$/.test(txt.replace(/\s/g, ""))) {
      await responder(chatId, "❌ Ingresa un número de cédula válido (solo números, entre 5 y 12 dígitos).");
      return;
    }
    saveConv(chatId, { paso: "email", cedula: txt.replace(/\s/g, "") });
    await responder(chatId,
      "✅ Cédula registrada.",
      "📧 ¿Cuál es tu *correo electrónico*? Te notificaremos cuando haya novedades."
    );
    return;
  }

  if (paso === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(txt)) {
      await responder(chatId, "❌ Ese correo no es válido. Por favor ingresa un correo electrónico correcto.");
      return;
    }
    const emailLower = txt.toLowerCase();
    saveConv(chatId, { paso: "caso", email: emailLower });

    const existentes = db.prepare(
      "SELECT codigo, estado FROM pqr WHERE LOWER(email) = ? ORDER BY fecha DESC LIMIT 5"
    ).all(emailLower);

    if (existentes.length > 0) {
      const ultimo = existentes[0];
      const resumen = existentes.length === 1
        ? `Encontré *1 caso* registrado con este correo: *${ultimo.codigo}* — ${ultimo.estado}.`
        : `Encontré *${existentes.length} casos*. El más reciente: *${ultimo.codigo}* — ${ultimo.estado}.`;
      await responder(chatId,
        `👋 ¡Hola de nuevo, *${conv.nombre}*! Ya eres un usuario registrado en el sistema.`,
        `📁 ${resumen}\n\nEscribe *CONSULTAR ${ultimo.codigo}* para ver los detalles.\n\n¿Quieres radicar un nuevo caso?`
      );
    } else {
      await responder(chatId,
        "✅ Correo registrado.",
        "📝 Cuéntame tu caso con el mayor detalle posible. ¿Qué petición, queja o reclamo tienes?"
      );
    }
    return;
  }

  if (paso === "procesando") {
    await responder(chatId, "⏳ Todavía estoy procesando tu caso anterior, espera un momento.");
    return;
  }

  if (paso === "caso") {
    if (txt.length < 10) {
      await responder(chatId, "⚠️ Por favor describe tu caso con más detalle.");
      return;
    }

    saveConv(chatId, { paso: "procesando" });
    await responder(chatId, "⏳ Evaluando su caso... espere un momento.");

    try {
      const clasificacion = await clasificarPQR(txt);
      const codigo        = generarCodigo();

      db.prepare(`
        INSERT INTO pqr (codigo, texto, nombre, cedula, email, tipo, categoria, prioridad, sentimiento, area, resumen, respuesta, confianza)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        codigo, txt, conv.nombre, conv.cedula || null, conv.email,
        clasificacion.tipo, clasificacion.categoria, clasificacion.prioridad,
        clasificacion.sentimiento, clasificacion.area_responsable,
        clasificacion.resumen, clasificacion.respuesta || null, clasificacion.confianza
      );

      saveConv(chatId, {
        paso: "followup",
        ultimo_codigo: codigo,
        ultima_clasificacion: JSON.stringify(clasificacion),
      });

      const tarjeta = [
        `✅ *¡Caso radicado exitosamente!*`,
        ``,
        `📌 *Código:* ${codigo}`,
        `🏷️ *Tipo:* ${clasificacion.tipo}`,
        `📂 *Categoría:* ${clasificacion.categoria}`,
        `⚡ *Prioridad:* ${clasificacion.prioridad}`,
        `🏢 *Área responsable:* ${clasificacion.area_responsable}`,
        `⏰ *Tiempo estimado:* ${PLAZOS[clasificacion.prioridad] || "5 días hábiles"}`,
      ].join("\n");

      await responder(chatId,
        tarjeta,
        `💬 *Respuesta preliminar:*\n\n${clasificacion.respuesta || "Tu caso está siendo procesado."}`,
        "¿Tienes alguna pregunta sobre tu caso? También puedes escribir *nuevo caso* para radicar otro."
      );

      enviarConfirmacionRadicacion(conv.nombre, conv.email, codigo, clasificacion).catch(() => {});

    } catch (err) {
      console.error("[TG Flow] Error clasificando:", err.message);
      saveConv(chatId, { paso: "caso" });
      await responder(chatId, "❌ Ocurrió un error al procesar tu caso. Por favor intenta de nuevo.");
    }
    return;
  }

  if (paso === "followup") {
    let clasificacion = {};
    try { clasificacion = JSON.parse(conv.ultima_clasificacion || "{}"); } catch {}
    const codigo = conv.ultimo_codigo;

    const respuesta = respuestaFollowup(txt, clasificacion, codigo);
    if (respuesta === null) {
      saveConv(chatId, { paso: "nombre", nombre: null, cedula: null, email: null, ultimo_codigo: null, ultima_clasificacion: null });
      await responder(chatId,
        "📝 Claro, vamos a radicar un nuevo caso.",
        "¿Cuál es tu *nombre completo*?"
      );
    } else {
      await responder(chatId, respuesta);
    }
    return;
  }

  // Estado desconocido — volver al menú
  saveConv(chatId, { paso: "menu", nombre: null, cedula: null, email: null });
  await responder(chatId, "👋 ¡Hola! Soy el asistente de PQR.\n\n" + MENU_OPCIONES);
}

// ─── Manejador unificado (texto + audio) ──────────────────────────────────────

async function manejarMensajeTG(msg) {
  // Solo mensajes privados (no grupos ni canales)
  if (msg.chat.type !== "private") return;

  const chatId = msg.chat.id;
  let texto = obtenerTextoTG(msg);

  if (esMensajeAudioTG(msg)) {
    try {
      const buffer = await descargarAudioTG(msg);
      if (buffer) {
        texto = await transcribirAudio(buffer);
        console.log(`[Telegram] Audio transcrito de ${chatId}: "${texto}"`);
      }
    } catch (err) {
      console.error("[Telegram] Error transcribiendo audio:", err.message);
      await enviarMensajeTG(chatId, "❌ No pude procesar tu mensaje de voz. Por favor escríbelo en texto.");
      return;
    }
  }

  if (!texto) return;
  await procesarMensajeTG(chatId, texto);
}

// ─── Notificaciones desde el panel admin ─────────────────────────────────────

async function notificarCambioEstadoTG(email, codigo, estado) {
  const conv = db.prepare("SELECT chat_id FROM conversaciones_tg WHERE LOWER(email) = ?").get(email.toLowerCase());
  if (!conv) return;
  const mensajes = {
    "En proceso": `📋 Tu caso *${codigo}* está ahora *En proceso*. Un funcionario está revisando tu solicitud.`,
    "Cerrada":    `✅ Tu caso *${codigo}* ha sido *Cerrado* y atendido satisfactoriamente.`,
    "Recibida":   `📬 Tu caso *${codigo}* fue marcado como *Recibido*.`,
  };
  await enviarMensajeTG(conv.chat_id, mensajes[estado] || `📋 El estado de tu caso *${codigo}* fue actualizado a *${estado}*.`).catch(() => {});
}

async function notificarRespuestaTG(email, codigo, respuesta) {
  const conv = db.prepare("SELECT chat_id FROM conversaciones_tg WHERE LOWER(email) = ?").get(email.toLowerCase());
  if (!conv) return;
  await enviarMensajeTG(conv.chat_id, `💬 *Respuesta oficial para tu caso ${codigo}:*\n\n${respuesta}`).catch(() => {});
}

module.exports = { manejarMensajeTG, notificarCambioEstadoTG, notificarRespuestaTG };
