const nodemailer = require("nodemailer");

const APP_URL = process.env.APP_URL || "http://localhost:5173";
const FROM    = process.env.EMAIL_FROM || `"Sistema PQR" <${process.env.EMAIL_USER}>`;

function crearTransporte() {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === "true",
    auth:   { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

async function enviar(to, subject, html) {
  const transport = crearTransporte();
  if (!transport) {
    console.log(`[Email] Sin configurar — omitido: ${subject} → ${to}`);
    return;
  }
  try {
    await transport.sendMail({ from: FROM, to, subject, html });
    console.log(`[Email] Enviado a ${to}: ${subject}`);
  } catch (err) {
    console.error(`[Email] Error al enviar a ${to}:`, err.message);
  }
}

// ────────────────────────────────────────────────────────────
// Templates
// ────────────────────────────────────────────────────────────

function wrapBase(contenido) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;">
    <div style="background:#1e40af;color:white;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="margin:0;font-size:22px;">Sistema PQR</h1>
      <p style="margin:8px 0 0;opacity:.85;font-size:13px;">Peticiones, Quejas y Reclamos</p>
    </div>
    <div style="background:white;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">
      ${contenido}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 16px;">
      <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
        Este es un mensaje automático. Por favor no respondas a este correo.
      </p>
    </div>
  </div>`;
}

function botonSeguimiento(codigo) {
  return `
  <div style="text-align:center;margin:28px 0;">
    <a href="${APP_URL}/consultar?codigo=${codigo}"
       style="background:#2563eb;color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">
      Ver estado de mi solicitud
    </a>
  </div>`;
}

// 1. Confirmación al radicar
function enviarConfirmacionRadicacion(nombre, email, codigo, clasificacion) {
  const html = wrapBase(`
    <p style="color:#374151;font-size:15px;">Hola <strong>${nombre}</strong>,</p>
    <p style="color:#374151;font-size:15px;">Tu solicitud fue recibida y clasificada correctamente. Guarda tu código para hacerle seguimiento.</p>

    <div style="background:#eff6ff;border:2px solid #2563eb;border-radius:10px;padding:20px;text-align:center;margin:24px 0;">
      <p style="margin:0 0 6px;color:#1e40af;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Código de seguimiento</p>
      <p style="margin:0;color:#1e40af;font-size:30px;font-weight:900;font-family:monospace;letter-spacing:3px;">${codigo}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;">
      <tr>
        <td style="padding:9px 12px;color:#64748b;width:40%;">Tipo</td>
        <td style="padding:9px 12px;color:#0f172a;font-weight:600;">${clasificacion.tipo}</td>
      </tr>
      <tr style="background:#f8fafc;">
        <td style="padding:9px 12px;color:#64748b;">Categoría</td>
        <td style="padding:9px 12px;color:#0f172a;font-weight:600;">${clasificacion.categoria}</td>
      </tr>
      <tr>
        <td style="padding:9px 12px;color:#64748b;">Prioridad</td>
        <td style="padding:9px 12px;color:#0f172a;font-weight:600;">${clasificacion.prioridad}</td>
      </tr>
      <tr style="background:#f8fafc;">
        <td style="padding:9px 12px;color:#64748b;">Área responsable</td>
        <td style="padding:9px 12px;color:#0f172a;font-weight:600;">${clasificacion.area_responsable}</td>
      </tr>
    </table>

    ${botonSeguimiento(codigo)}
  `);

  return enviar(email, `✅ PQR recibida — Código ${codigo}`, html);
}

// 2. Cambio de estado
function enviarCambioEstado(nombre, email, codigo, nuevoEstado) {
  const paleta = {
    "En proceso": { fondo: "#eff6ff", borde: "#2563eb", texto: "#1e40af" },
    "Cerrada":    { fondo: "#f0fdf4", borde: "#16a34a", texto: "#15803d" },
    "Recibida":   { fondo: "#fffbeb", borde: "#d97706", texto: "#b45309" },
  };
  const mensajes = {
    "Recibida":   "Tu solicitud ha sido marcada como recibida nuevamente.",
    "En proceso": "Un funcionario está revisando tu caso. Te avisaremos cuando haya una respuesta.",
    "Cerrada":    "Tu solicitud fue atendida y el caso ha sido cerrado.",
  };

  const c = paleta[nuevoEstado] || paleta["Recibida"];

  const html = wrapBase(`
    <p style="color:#374151;font-size:15px;">Hola <strong>${nombre}</strong>,</p>
    <p style="color:#374151;font-size:15px;">
      El estado de tu solicitud <strong style="font-family:monospace;">${codigo}</strong> ha sido actualizado.
    </p>

    <div style="background:${c.fondo};border:2px solid ${c.borde};border-radius:10px;padding:20px;text-align:center;margin:24px 0;">
      <p style="margin:0 0 6px;color:${c.texto};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Nuevo estado</p>
      <p style="margin:0;color:${c.texto};font-size:26px;font-weight:900;">${nuevoEstado}</p>
    </div>

    <p style="color:#374151;font-size:14px;">${mensajes[nuevoEstado] || ""}</p>

    ${botonSeguimiento(codigo)}
  `);

  return enviar(email, `📋 Actualización de tu PQR — ${codigo}`, html);
}

// 3. Respuesta institucional disponible
function enviarRespuestaDisponible(nombre, email, codigo, respuesta) {
  const html = wrapBase(`
    <p style="color:#374151;font-size:15px;">Hola <strong>${nombre}</strong>,</p>
    <p style="color:#374151;font-size:15px;">
      La institución ha emitido una respuesta oficial para tu solicitud
      <strong style="font-family:monospace;">${codigo}</strong>.
    </p>

    <div style="background:#f8fafc;border-left:4px solid #2563eb;border-radius:0 8px 8px 0;padding:20px;margin:24px 0;">
      <p style="margin:0 0 10px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">
        Respuesta institucional
      </p>
      <p style="margin:0;color:#0f172a;font-size:14px;line-height:1.75;white-space:pre-wrap;">${respuesta}</p>
    </div>

    ${botonSeguimiento(codigo)}
  `);

  return enviar(email, `💬 Respuesta disponible — ${codigo}`, html);
}

module.exports = { enviarConfirmacionRadicacion, enviarCambioEstado, enviarRespuestaDisponible };
