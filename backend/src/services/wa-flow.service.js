const { db }                        = require("../models/database");
const { clasificarPQR }             = require("./classifier.service");
const { generarCodigo }             = require("./codigo.service");
const { enviarConfirmacionRadicacion } = require("./email.service");
const { enviarMensaje, descargarAudio, obtenerTextoMensaje, esMensajeAudio } = require("./whatsapp.service");
const { transcribirAudio }          = require("./transcription.service");

const PLAZOS = { Alta: "24 horas", Media: "3 días hábiles", Baja: "5 días hábiles" };
const INACTIVIDAD_HORAS = 24;
const NOW_BOGOTA = "TO_CHAR(NOW() AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD HH24:MI:SS')";

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

// ─── DB helpers ─────────────────────────────────────────────────────────────

function getConv(phone) {
  return db.prepare("SELECT * FROM conversaciones_wa WHERE phone = ?").get(phone);
}

async function saveConv(phone, campos) {
  const existe = await db.prepare("SELECT phone FROM conversaciones_wa WHERE phone = ?").get(phone);
  if (existe) {
    const keys = Object.keys(campos);
    const sets = keys.map(k => `${k} = ?`).join(", ");
    await db.prepare(`UPDATE conversaciones_wa SET ${sets}, updated_at = ${NOW_BOGOTA} WHERE phone = ?`)
      .run(...keys.map(k => campos[k]), phone);
  } else {
    await db.prepare(`
      INSERT INTO conversaciones_wa (phone, paso, nombre, cedula, email, ultimo_codigo, ultima_clasificacion)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      phone,
      campos.paso ?? "nombre",
      campos.nombre ?? null,
      campos.cedula ?? null,
      campos.email  ?? null,
      campos.ultimo_codigo        ?? null,
      campos.ultima_clasificacion ?? null
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function responder(phone, ...textos) {
  for (let i = 0; i < textos.length; i++) {
    await enviarMensaje(phone, textos[i]);
    if (i < textos.length - 1) await new Promise(r => setTimeout(r, 600));
  }
}

function estaInactivo(conv) {
  if (!conv?.updated_at) return false;
  const horas = (Date.now() - new Date(conv.updated_at).getTime()) / 3_600_000;
  return horas > INACTIVIDAD_HORAS;
}

// ─── Lógica de followup (espejo del frontend) ────────────────────────────────

async function respuestaFollowup(txt, clasificacion, codigo) {
  const t = txt.toLowerCase();

  if (/nuevo\s*caso|otro\s*caso|otra\s*queja|radicar/i.test(t))
    return null; // señal para pasar a 'caso'

  if (/cuándo|cuando|tiempo|demora|días|dias|tarda|plazo|esperar/i.test(t))
    return `⏰ Tu caso tiene prioridad *${clasificacion.prioridad}*, tiempo estimado: *${PLAZOS[clasificacion.prioridad] || "5 días hábiles"}*. El área de *${clasificacion.area_responsable}* lo atenderá.`;

  if (/quién|quien|área|area|encarga|responsable/i.test(t))
    return `🏢 Tu caso fue asignado al área de *${clasificacion.area_responsable}*. Responderán en *${PLAZOS[clasificacion.prioridad] || "5 días hábiles"}*.`;

  if (/código|codigo|número|numero|radicado/i.test(t))
    return `📌 Tu código es *${codigo}*. Escribe *CONSULTAR ${codigo}* para ver el estado.`;

  if (/estado|cómo va|como va|novedad/i.test(t)) {
    const pqr = await db.prepare("SELECT estado, respuesta FROM pqr WHERE codigo = ?").get(codigo);
    if (pqr) return `📋 Estado de *${codigo}*: *${pqr.estado}*${pqr.respuesta ? "\n\n💬 Respuesta:\n" + pqr.respuesta : ""}`;
  }

  return `Tu caso *${codigo}* está en manos del área de ${clasificacion.area_responsable} (prioridad ${clasificacion.prioridad} — ${PLAZOS[clasificacion.prioridad] || "5 días hábiles"}). ¿Necesitas algo más?\n\nEscribe *nuevo caso* para radicar otra solicitud.`;
}

// ─── Procesador principal ────────────────────────────────────────────────────

async function procesarMensaje(phone, texto) {
  const txt = texto.trim();
  console.log(`[WA Flow] De ${phone}: "${txt}" | longitud: ${txt.length}`);
  if (!txt) return;

  // Comando: consultar estado de un caso (disponible siempre)
  const matchConsulta = txt.match(/^consultar\s+(PQR-\d{4}-\d{4})$/i);
  if (matchConsulta) {
    const codigo = matchConsulta[1].toUpperCase();
    const pqr = await db.prepare("SELECT estado, tipo, categoria, prioridad, respuesta FROM pqr WHERE codigo = ?").get(codigo);
    if (pqr) {
      const resp = pqr.respuesta ? `\n\n💬 *Respuesta:*\n${pqr.respuesta}` : "";
      await responder(phone, `📋 *Estado del caso ${codigo}*\n\n📌 Estado: *${pqr.estado}*\n🏷️ Tipo: ${pqr.tipo} — ${pqr.categoria}\n⚡ Prioridad: ${pqr.prioridad}${resp}`);
    } else {
      await responder(phone, `❌ No encontré ningún caso con el código *${codigo}*.`);
    }
    return;
  }

  let conv = await getConv(phone);

  // Usuario completamente nuevo: solo responde al trigger exacto
  if (!conv) {
    const TRIGGER = /^hola,?\s+vengo\s+a\s+dejar\s+una\s+pqr\.?$/i;
    if (!TRIGGER.test(txt)) return;
    await saveConv(phone, { paso: "menu", nombre: null, cedula: null, email: null, ultimo_codigo: null, ultima_clasificacion: null });
    await responder(phone,
      "👋 ¡Hola! Soy *Valeria*, tu asistente virtual del sistema de *PQR* de la institución educativa.",
      MENU_OPCIONES
    );
    return;
  }

  // Reiniciar — borrar conversación para exigir el trigger de nuevo
  if (/^(reiniciar|reset|cancelar)$/i.test(txt)) {
    await db.prepare("DELETE FROM conversaciones_wa WHERE phone = ?").run(phone);
    await responder(phone, 'Conversación reiniciada. Cuando quieras comenzar escribe:\n\n*Hola, vengo a dejar una PQR*');
    return;
  }

  // Volver al menú principal en cualquier momento
  if (RE_MENU.test(txt) && conv.paso !== "procesando") {
    await saveConv(phone, { paso: "menu" });
    await responder(phone, MENU_OPCIONES);
    return;
  }

  // Usuario que vuelve después de inactividad → mostrar menú de nuevo
  if (estaInactivo(conv) && conv.paso !== "procesando") {
    await saveConv(phone, { paso: "menu", nombre: null, cedula: null, email: null, ultimo_codigo: null, ultima_clasificacion: null });
    await responder(phone,
      "👋 ¡Hola de nuevo! Soy *Valeria*, ¿en qué puedo ayudarte hoy?",
      MENU_OPCIONES
    );
    return;
  }

  const paso = conv.paso;

  // ── Pasos del flujo ──────────────────────────────────────────────────────

  if (paso === "menu") {
    if (txt === "1") {
      await saveConv(phone, { paso: "nombre", nombre: null, cedula: null, email: null, ultimo_codigo: null, ultima_clasificacion: null });
      await responder(phone, "📋 Perfecto, vamos a radicar tu PQR. ¿Cuál es tu *nombre completo*?");
      return;
    }
    if (txt === "2") {
      await saveConv(phone, { paso: "consultar_cedula" });
      await responder(phone,
        "🪪 Escribe tu *número de cédula* para ver tus casos registrados.",
        VOLVER_MENU
      );
      return;
    }
    await responder(phone, "🤔 No entendí tu respuesta. Responde con *1* o *2*.\n\n" + MENU_OPCIONES);
    return;
  }

  if (paso === "consultar_cedula") {
    if (txt === "0") {
      await saveConv(phone, { paso: "menu" });
      await responder(phone, MENU_OPCIONES);
      return;
    }

    const cedula = txt.replace(/\s/g, "");
    if (!/^\d{5,12}$/.test(cedula)) {
      await responder(phone, `❌ Ingresa un número de cédula válido (solo números, entre 5 y 12 dígitos).\n\n${VOLVER_MENU}`);
      return;
    }

    const casos = await db.prepare(
      "SELECT codigo, categoria, estado, fecha FROM pqr WHERE cedula = ? ORDER BY fecha DESC LIMIT 9"
    ).all(cedula);

    if (casos.length === 0) {
      await responder(phone, `❌ No encontré ningún caso registrado con la cédula *${cedula}*.\n\nIntenta con otra cédula, o ${VOLVER_MENU.toLowerCase()}`);
      return;
    }

    const NUMS = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];
    const lista = casos.map((c, i) =>
      `${NUMS[i]} *${c.codigo}* — ${c.categoria} (${c.estado}) — ${(c.fecha || "").slice(0, 10)}`
    ).join("\n");

    await saveConv(phone, {
      paso: "consultar_lista",
      ultima_clasificacion: JSON.stringify(casos.map(c => c.codigo)),
    });

    await responder(phone,
      `📋 Encontré *${casos.length}* caso(s) con la cédula *${cedula}*:\n\n${lista}`,
      `Escribe el número del caso que deseas ver.\n\n${VOLVER_MENU}`
    );
    return;
  }

  if (paso === "consultar_lista") {
    if (txt === "0") {
      await saveConv(phone, { paso: "menu", ultima_clasificacion: null });
      await responder(phone, MENU_OPCIONES);
      return;
    }

    let codigos = [];
    try { codigos = JSON.parse(conv.ultima_clasificacion || "[]"); } catch {}

    const idx = parseInt(txt, 10);
    if (!Number.isInteger(idx) || idx < 1 || idx > codigos.length) {
      await responder(phone, `❌ Elige un número entre *1* y *${codigos.length}*.\n\n${VOLVER_MENU}`);
      return;
    }

    const codigo = codigos[idx - 1];
    const pqr = await db.prepare("SELECT estado, tipo, categoria, prioridad, respuesta FROM pqr WHERE codigo = ?").get(codigo);

    if (pqr) {
      const resp = pqr.respuesta ? `\n\n💬 *Respuesta:*\n${pqr.respuesta}` : "";
      await responder(phone, `📋 *Estado del caso ${codigo}*\n\n📌 Estado: *${pqr.estado}*\n🏷️ Tipo: ${pqr.tipo} — ${pqr.categoria}\n⚡ Prioridad: ${pqr.prioridad}${resp}`);
    } else {
      await responder(phone, `❌ No encontré información del caso *${codigo}*.`);
    }

    await saveConv(phone, { paso: "menu", ultima_clasificacion: null });
    await responder(phone, MENU_OPCIONES);
    return;
  }

  if (paso === "nombre") {
    if (txt.length < 3) {
      await responder(phone, "⚠️ Por favor ingresa tu nombre completo.");
      return;
    }
    await saveConv(phone, { paso: "cedula", nombre: txt });
    await responder(phone,
      `Gracias, *${txt}*. 👋`,
      "🪪 Ahora ingresa tu *número de cédula* (solo números)."
    );
    return;
  }

  if (paso === "cedula") {
    if (!/^\d{5,12}$/.test(txt.replace(/\s/g, ""))) {
      await responder(phone, "❌ Ingresa un número de cédula válido (solo números, entre 5 y 12 dígitos).");
      return;
    }
    await saveConv(phone, { paso: "email", cedula: txt.replace(/\s/g, "") });
    await responder(phone,
      "✅ Cédula registrada.",
      "📧 ¿Cuál es tu *correo electrónico*? Te notificaremos cuando haya novedades."
    );
    return;
  }

  if (paso === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(txt)) {
      await responder(phone, "❌ Ese correo no es válido. Por favor ingresa un correo electrónico correcto.");
      return;
    }
    const emailLower = txt.toLowerCase();
    await saveConv(phone, { paso: "caso", email: emailLower });

    const existentes = await db.prepare(
      "SELECT codigo, estado FROM pqr WHERE LOWER(email) = ? ORDER BY fecha DESC LIMIT 5"
    ).all(emailLower);

    if (existentes.length > 0) {
      const ultimo = existentes[0];
      const resumen = existentes.length === 1
        ? `Encontré *1 caso* registrado con este correo: *${ultimo.codigo}* — ${ultimo.estado}.`
        : `Encontré *${existentes.length} casos*. El más reciente: *${ultimo.codigo}* — ${ultimo.estado}.`;
      await responder(phone,
        `👋 ¡Hola de nuevo, *${conv.nombre}*! Ya eres un usuario registrado en el sistema.`,
        `📁 ${resumen}\n\nEscribe *CONSULTAR ${ultimo.codigo}* para ver los detalles.\n\n¿Quieres radicar un nuevo caso?`
      );
    } else {
      await responder(phone,
        "✅ Correo registrado.",
        "📝 Cuéntame tu caso con el mayor detalle posible. ¿Qué petición, queja o reclamo tienes?"
      );
    }
    return;
  }

  if (paso === "procesando") {
    await responder(phone, "⏳ Todavía estoy procesando tu caso anterior, espera un momento.");
    return;
  }

  if (paso === "caso") {
    if (txt.length < 10) {
      await responder(phone, "⚠️ Por favor describe tu caso con más detalle.");
      return;
    }

    await saveConv(phone, { paso: "procesando" });
    await responder(phone, "⏳ Evaluando su caso... espere un momento.");

    try {
      const clasificacion = await clasificarPQR(txt);
      const codigo        = generarCodigo();

      await db.prepare(`
        INSERT INTO pqr (codigo, texto, nombre, cedula, email, tipo, categoria, prioridad, sentimiento, area, resumen, respuesta, confianza)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        codigo, txt, conv.nombre, conv.cedula || null, conv.email,
        clasificacion.tipo, clasificacion.categoria, clasificacion.prioridad,
        clasificacion.sentimiento, clasificacion.area_responsable,
        clasificacion.resumen, clasificacion.respuesta || null, clasificacion.confianza
      );

      await saveConv(phone, {
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

      await responder(phone,
        tarjeta,
        `💬 *Respuesta preliminar:*\n\n${clasificacion.respuesta || "Tu caso está siendo procesado."}`,
        "¿Tienes alguna pregunta sobre tu caso? También puedes escribir *nuevo caso* para radicar otro."
      );

      enviarConfirmacionRadicacion(conv.nombre, conv.email, codigo, clasificacion).catch(() => {});

    } catch (err) {
      console.error("[WA Flow] Error clasificando:", err.message);
      await saveConv(phone, { paso: "caso" });
      await responder(phone, "❌ Ocurrió un error al procesar tu caso. Por favor intenta de nuevo.");
    }
    return;
  }

  if (paso === "followup") {
    let clasificacion = {};
    try { clasificacion = JSON.parse(conv.ultima_clasificacion || "{}"); } catch {}
    const codigo = conv.ultimo_codigo;

    const respuesta = await respuestaFollowup(txt, clasificacion, codigo);
    if (respuesta === null) {
      await saveConv(phone, { paso: "nombre", nombre: null, cedula: null, email: null, ultimo_codigo: null, ultima_clasificacion: null });
      await responder(phone,
        "📝 Claro, vamos a radicar un nuevo caso.",
        "¿Cuál es tu *nombre completo*?"
      );
    } else {
      await responder(phone, respuesta);
    }
    return;
  }

  // Estado desconocido — volver al menú
  await saveConv(phone, { paso: "menu", nombre: null, cedula: null, email: null });
  await responder(phone, "👋 ¡Hola! Soy *Valeria*, el asistente de PQR.\n\n" + MENU_OPCIONES);
}

// ─── Manejador unificado (texto + audio) ─────────────────────────────────────

async function manejarMensajeWA(msg) {
  const jid = msg.key.remoteJid;
  // Aceptar chats personales: JID estándar (@s.whatsapp.net) y LID moderno (@lid)
  if (!jid.endsWith("@s.whatsapp.net") && !jid.endsWith("@lid")) return;

  // Usar el JID completo como identificador (funciona para ambos formatos)
  const phone = jid;
  let texto   = obtenerTextoMensaje(msg);

  if (esMensajeAudio(msg)) {
    try {
      const buffer = await descargarAudio(msg);
      if (buffer) {
        texto = await transcribirAudio(buffer);
        console.log(`[WhatsApp] Audio transcrito de ${phone}: "${texto}"`);
      }
    } catch (err) {
      console.error("[WhatsApp] Error transcribiendo audio:", err.message);
      await enviarMensaje(`${phone}@s.whatsapp.net`, "❌ No pude procesar tu mensaje de audio. Por favor escríbelo en texto.");
      return;
    }
  }

  if (!texto) return;
  await procesarMensaje(phone, texto);
}

// ─── Notificaciones desde el panel admin ─────────────────────────────────────

async function notificarCambioEstado(email, codigo, estado) {
  const conv = await db.prepare("SELECT phone FROM conversaciones_wa WHERE LOWER(email) = ?").get(email.toLowerCase());
  if (!conv) return;
  const mensajes = {
    "En proceso": `📋 Tu caso *${codigo}* está ahora *En proceso*. Un funcionario está revisando tu solicitud.`,
    "Cerrada":    `✅ Tu caso *${codigo}* ha sido *Cerrado* y atendido satisfactoriamente.`,
    "Recibida":   `📬 Tu caso *${codigo}* fue marcado como *Recibido*.`,
  };
  await enviarMensaje(conv.phone, mensajes[estado] || `📋 El estado de tu caso *${codigo}* fue actualizado a *${estado}*.`).catch(() => {});
}

async function notificarRespuesta(email, codigo, respuesta) {
  const conv = await db.prepare("SELECT phone FROM conversaciones_wa WHERE LOWER(email) = ?").get(email.toLowerCase());
  if (!conv) return;
  await enviarMensaje(conv.phone, `💬 *Respuesta oficial para tu caso ${codigo}:*\n\n${respuesta}`).catch(() => {});
}

module.exports = { manejarMensajeWA, notificarCambioEstado, notificarRespuesta };
