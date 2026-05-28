import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Bot, Send, Sparkles, CheckCircle2, FileText, Loader2,
  ClipboardList, Search, History, MessageSquare, ChevronRight, Plus, MessageCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useChatContext } from "../context/ChatContext";
import { radicarPQR, consultarPorEmail } from "../services/pqr.service";
import Navbar from "../components/Navbar";
import styles from "./Chat.module.css";

const PRIORIDAD_COLOR = { Alta: "#dc2626", Media: "#d97706", Baja: "#059669" };
const PRIORIDAD_BG    = { Alta: "#fef2f2", Media: "#fffbeb", Baja: "#f0fdf4" };

const SUGERENCIAS = [
  "No puedo descargar mi recibo de matrícula",
  "Un compañero me está molestando constantemente",
  "Mi nota aparece incorrecta en el sistema académico",
  "No puedo acceder al campus virtual",
  "Quiero saber los horarios de atención de la biblioteca",
];

const SUGERENCIAS_FOLLOWUP = [
  "¿Cuándo me responden?",
  "¿Quién se encarga de mi caso?",
  "¿Qué sigue ahora?",
  "Radicar otro caso",
];

const PLAZOS = { Alta: "24 horas", Media: "3 días hábiles", Baja: "5 días hábiles" };

function hora() {
  return new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function pasosIniciales(usuario) {
  if (!usuario) return "nombre";
  if (!usuario.cedula) return "cedula";
  return "caso";
}

function responderFollowup(pregunta, resultado) {
  const txt = pregunta.toLowerCase();
  const c   = resultado.clasificacion;
  const cod = resultado.codigo;

  if (/nuevo|otro caso|otra queja|diferente|adicional/.test(txt)) return null;

  if (/cuándo|cuando|tiempo|demora|días|dias|tarda|plazo|esperar/.test(txt)) {
    return `Tu caso tiene prioridad ${c.prioridad}, por lo que el tiempo estimado de atención es de ${PLAZOS[c.prioridad] || "5 días hábiles"}. El área de ${c.area_responsable} se pondrá en contacto contigo. Puedes monitorear el estado con tu código ${cod}.`;
  }

  if (/quién|quien|área|area|encarga|responsable|departamento|contactar/.test(txt)) {
    return `Tu caso fue asignado al área de ${c.area_responsable}. Ellos revisarán tu solicitud y gestionarán la respuesta formal dentro del plazo de ${PLAZOS[c.prioridad] || "5 días hábiles"}.`;
  }

  if (/qué sigue|que sigue|próximo|proximo|siguiente|proceso|pasos|ahora/.test(txt)) {
    return `El proceso es:\n\n1. Tu caso ingresó con estado "Recibida"\n2. El área de ${c.area_responsable} lo revisará\n3. Te darán una respuesta formal\n\nPuedes consultar el avance en cualquier momento con el código ${cod}.`;
  }

  if (/código|codigo|número|numero|referencia|radicado/.test(txt)) {
    return `Tu código de radicado es ${cod}. Guárdalo: con él puedes consultar el estado actual en la sección "Consultar estado" sin necesidad de iniciar sesión.`;
  }

  if (/prioridad|urgente|urgencia|importante|grave/.test(txt)) {
    const desc = { Alta: "un caso de alta urgencia con atención preferencial.", Media: "un caso de prioridad media con atención normal.", Baja: "un caso de baja urgencia dentro del flujo estándar." };
    return `Tu caso fue clasificado con prioridad ${c.prioridad}: es ${desc[c.prioridad] || "procesado según los protocolos institucionales."}`;
  }

  if (/respuesta|contestar|contestaron|respondieron|revisaron/.test(txt)) {
    return `La respuesta que ves arriba fue generada automáticamente como orientación inicial. La respuesta oficial y definitiva llegará directamente del área de ${c.area_responsable} en un plazo de ${PLAZOS[c.prioridad] || "5 días hábiles"}.`;
  }

  if (/tipo|categoría|categoria|clasificación|clasificacion/.test(txt)) {
    return `Tu caso fue clasificado como "${c.tipo}" en la categoría "${c.categoria}". Esta clasificación determina qué área lo atiende y con qué prioridad.`;
  }

  return `Entendido. Tu caso ${cod} está en manos del área de ${c.area_responsable} con prioridad ${c.prioridad} (${PLAZOS[c.prioridad] || "5 días hábiles"}). Si tienes otra duda sobre este caso o quieres radicar uno nuevo, con gusto te ayudo.`;
}

export default function Chat() {
  const { usuario } = useAuth();
  const { mensajes, setMensajes, paso, setPaso, datos, setDatos, resultado, setResultado } = useChatContext();

  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Inicializar solo la primera vez (mensajes === null significa no inicializado)
  useEffect(() => {
    if (mensajes !== null) return;
    setPaso(pasosIniciales(usuario));
    setDatos({
      nombre: usuario?.nombre || "",
      cedula: usuario?.cedula || "",
      email:  usuario?.email  || "",
    });
    const ms = [];
    if (!usuario) {
      ms.push(
        msg("bot", "Hola, soy el asistente de PQR de tu institución."),
        msg("bot", "Para comenzar, ¿cuál es tu nombre completo?")
      );
    } else if (!usuario.cedula) {
      ms.push(
        msg("bot", `Bienvenido, ${usuario.nombre}.`),
        msg("bot", "Para identificar tu caso necesito tu número de cédula.")
      );
    } else {
      ms.push(
        msg("bot", `Hola, ${usuario.nombre}. Estoy listo para ayudarte.`),
        msg("bot", "Cuéntame tu caso con detalle. ¿Qué petición, queja o reclamo tienes?")
      );
    }
    setMensajes(ms);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensajes]);
  useEffect(() => {
    if (paso && paso !== "procesando") inputRef.current?.focus();
  }, [paso, mensajes]);

  function msg(de, texto, tipo = null) { return { de, texto, tipo, hora: hora() }; }
  function push(...nuevos) { setMensajes(p => [...p, ...nuevos]); }

  async function enviar(texto) {
    const txt = texto.trim();
    if (!txt || !paso || paso === "procesando") return;
    setInput("");
    push(msg("user", txt));

    if (paso === "nombre") {
      setDatos(d => ({ ...d, nombre: txt }));
      setPaso("cedula");
      setTimeout(() => push(
        msg("bot", `Gracias, ${txt}.`),
        msg("bot", "Ahora ingresa tu número de cédula. Con ella podrás consultar todos tus casos en cualquier momento.")
      ), 300);
      return;
    }

    if (paso === "cedula") {
      if (!/^\d{5,12}$/.test(txt.replace(/\s/g, ""))) {
        setTimeout(() => push(msg("bot", "Por favor ingresa un número de cédula válido (solo números, entre 5 y 12 dígitos).")), 300);
        return;
      }
      setDatos(d => ({ ...d, cedula: txt }));
      if (usuario) {
        setPaso("caso");
        setTimeout(() => push(
          msg("bot", "Cédula registrada."),
          msg("bot", "Cuéntame tu caso con el mayor detalle posible.")
        ), 300);
      } else {
        setPaso("email");
        setTimeout(() => push(
          msg("bot", "Cédula registrada."),
          msg("bot", "¿Cuál es tu correo electrónico? Te notificaremos cuando haya novedades en tu caso.")
        ), 300);
      }
      return;
    }

    if (paso === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(txt)) {
        setTimeout(() => push(msg("bot", "Ese correo no parece válido. Por favor ingresa un correo electrónico correcto.")), 300);
        return;
      }
      setDatos(d => ({ ...d, email: txt }));
      setPaso("caso");

      try {
        const { data } = await consultarPorEmail(txt);
        if (data.total > 0) {
          const ultimo = data.pqrs[0];
          const resumen = data.total === 1
            ? `Encontré 1 caso registrado con este correo (${ultimo.codigo} — ${ultimo.estado}).`
            : `Encontré ${data.total} casos registrados con este correo. El más reciente: ${ultimo.codigo} — ${ultimo.estado}.`;
          setTimeout(() => push(
            msg("bot", `Hola de nuevo, ${datos.nombre}. Ya eres un usuario registrado en el sistema.`),
            msg("bot", resumen),
            msg("bot", "Puedes consultar tus casos en cualquier momento desde la sección 'Consultar estado'. ¿Quieres radicar un nuevo caso ahora?")
          ), 300);
        } else {
          setTimeout(() => push(
            msg("bot", "Correo registrado correctamente."),
            msg("bot", "Cuéntame tu caso con el mayor detalle posible. ¿Qué petición, queja o reclamo tienes?")
          ), 300);
        }
      } catch {
        setTimeout(() => push(
          msg("bot", "Correo registrado correctamente."),
          msg("bot", "Cuéntame tu caso con el mayor detalle posible. ¿Qué petición, queja o reclamo tienes?")
        ), 300);
      }
      return;
    }

    if (paso === "caso") {
      if (txt.length < 10) {
        setTimeout(() => push(msg("bot", "Por favor describe tu caso con un poco más de detalle para poder ayudarte mejor.")), 300);
        return;
      }
      setPaso("procesando");
      setTimeout(() => push(msg("bot", "Evaluando su caso... espere un momento.")), 300);

      try {
        const { data } = await radicarPQR({
          texto: txt,
          nombre: datos.nombre || usuario?.nombre,
          cedula: datos.cedula || usuario?.cedula || undefined,
          email:  datos.email  || usuario?.email,
        });
        setResultado(data);
        setPaso("listo");

        const c = data.clasificacion;
        setTimeout(() => {
          push(
            msg("bot", `Tu caso fue radicado con el código ${data.codigo}.`),
            msg("bot", `Clasificado como ${c.tipo} — categoría ${c.categoria}, prioridad ${c.prioridad}.`)
          );

          setTimeout(() => {
            push(msg("bot", "La respuesta institucional aparece en la tarjeta de arriba. ¿Tienes alguna pregunta sobre tu caso, los tiempos o el área responsable?"));
            setPaso("followup");
          }, 700);
        }, 400);
      } catch (err) {
        setPaso("caso");
        setTimeout(() => push(msg("bot", err.response?.data?.error || "Error al procesar tu caso. Intenta de nuevo.")), 300);
      }
      return;
    }

    if (paso === "followup") {
      const respuesta = responderFollowup(txt, resultado);
      if (respuesta === null) {
        setResultado(null);
        setPaso("caso");
        setTimeout(() => push(msg("bot", "Claro, cuéntame tu nuevo caso con detalle.")), 300);
      } else {
        setTimeout(() => push(msg("bot", respuesta)), 300);
      }
      return;
    }

    if (paso === "listo") {
      setResultado(null);
      setPaso("caso");
      setTimeout(() => push(msg("bot", "Claro, cuéntame tu nuevo caso.")), 300);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(input); }
  }

  const mostrarChips = paso === "caso" || paso === "followup";
  const chipsActuales = paso === "followup" ? SUGERENCIAS_FOLLOWUP : SUGERENCIAS;

  if (!mensajes) return null;

  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.layout}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sideCard}>
            <div className={styles.sideIconWrap}>
              <Bot size={28} className={styles.botPulse} />
            </div>
            <h3>Asistente PQR</h3>
            <p>Te guío paso a paso para radicar tu petición, queja o reclamo de forma eficiente.</p>
          </div>

          <div className={styles.sideCard}>
            <h4>¿Cómo funciona?</h4>
            <ol className={styles.steps}>
              <li><CheckCircle2 size={15} className={styles.stepIcon} /><span>Cuéntame tu caso</span></li>
              <li><Sparkles     size={15} className={styles.stepIcon} /><span>La IA lo clasifica</span></li>
              <li><FileText     size={15} className={styles.stepIcon} /><span>Recibes un código</span></li>
              <li><Search       size={15} className={styles.stepIcon} /><span>Haz seguimiento</span></li>
            </ol>
          </div>

          {!usuario && (
            <div className={styles.sideLoginCard}>
              <p>¿Ya tienes cuenta?</p>
              <Link to="/login" className={styles.sideLoginBtn}>Iniciar sesión</Link>
            </div>
          )}

          <a
            href="https://wa.me/573105260516"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sideWaCard}
          >
            <div className={styles.sideWaIcon}>
              <MessageCircle size={22} />
            </div>
            <div>
              <p className={styles.sideWaTitle}>¿Prefieres WhatsApp?</p>
              <p className={styles.sideWaDesc}>Radica tu PQR directamente desde WhatsApp con nuestro asistente.</p>
              <span className={styles.sideWaBtn}>Abrir WhatsApp <ChevronRight size={13} /></span>
            </div>
          </a>

          <a
            href="https://t.me/SistemaPQR_Bot"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sideTgCard}
          >
            <div className={styles.sideTgIcon}>
              <Send size={20} />
            </div>
            <div>
              <p className={styles.sideTgTitle}>¿Prefieres Telegram?</p>
              <p className={styles.sideTgDesc}>Radica tu PQR desde Telegram con nuestro asistente.</p>
              <span className={styles.sideTgBtn}>Abrir Telegram <ChevronRight size={13} /></span>
            </div>
          </a>

          <div className={styles.sideCard}>
            <h4>Consultar estado</h4>
            <p>¿Ya radicaste un caso? Consulta su estado por código o cédula.</p>
            <Link to="/consultar" className={styles.sideLinkBtn}>
              <Search size={13} /> Ir a consultar
            </Link>
          </div>
        </aside>

        {/* Main chat */}
        <main className={styles.chatMain}>
          <div className={styles.chatWindow}>
            <div className={styles.messages}>
              {mensajes.map((m, i) => <Burbuja key={i} m={m} />)}
              {paso === "procesando" && <TypingDots />}

              {resultado && (paso === "listo" || paso === "followup") && (
                <div className={styles.resultCard}>
                  <div className={styles.resultHeader}>
                    <div className={styles.resultIconWrap}>
                      <ClipboardList size={20} className={styles.resultIconColor} />
                    </div>
                    <div>
                      <p className={styles.resultTitle}>Caso radicado exitosamente</p>
                      <p className={styles.resultCodigo}>{resultado.codigo}</p>
                    </div>
                    {(paso === "followup") && (
                      <button
                        className={styles.btnNuevoCaso}
                        onClick={() => { setResultado(null); setPaso("caso"); push(msg("bot", "Claro, cuéntame tu nuevo caso.")); }}
                      >
                        <Plus size={13} /> Nuevo caso
                      </button>
                    )}
                  </div>
                  <div className={styles.resultGrid}>
                    <Chip label="Tipo"      value={resultado.clasificacion.tipo} />
                    <Chip label="Categoría" value={resultado.clasificacion.categoria} />
                    <Chip
                      label="Prioridad"
                      value={resultado.clasificacion.prioridad}
                      color={PRIORIDAD_COLOR[resultado.clasificacion.prioridad]}
                      bg={PRIORIDAD_BG[resultado.clasificacion.prioridad]}
                    />
                    <Chip label="Sentimiento"      value={resultado.clasificacion.sentimiento} />
                    <Chip label="Área responsable" value={resultado.clasificacion.area_responsable} wide />
                  </div>
                  <BarConfianza v={resultado.clasificacion.confianza} />

                  {resultado.clasificacion.respuesta && (
                    <div className={styles.respuestaBox}>
                      <div className={styles.respuestaBoxHeader}>
                        <MessageSquare size={14} className={styles.respuestaBoxIcon} />
                        <span className={styles.respuestaBoxLabel}>Respuesta institucional</span>
                      </div>
                      <p className={styles.respuestaBoxTexto}>{resultado.clasificacion.respuesta}</p>
                    </div>
                  )}

                  <div className={styles.resultLinks}>
                    <Link to={`/consultar?codigo=${resultado.codigo}`} className={styles.resultLink}>
                      <Search size={13} /> Consultar estado
                    </Link>
                    {usuario && (
                      <Link to="/historial" className={styles.resultLink}>
                        <History size={13} /> Ver en mi historial
                      </Link>
                    )}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {mostrarChips && (
              <div className={styles.chips}>
                {chipsActuales.map(s => (
                  <button key={s} className={styles.chip} onClick={() => enviar(s)}>
                    <ChevronRight size={12} />
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className={styles.inputBar}>
              <textarea
                ref={inputRef}
                className={styles.input}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                disabled={paso === "procesando"}
                placeholder={
                  paso === "nombre"    ? "Escribe tu nombre completo..."
                  : paso === "cedula" ? "Número de cédula..."
                  : paso === "email"  ? "Correo electrónico..."
                  : paso === "followup" ? "Pregunta sobre tu caso o escribe 'nuevo caso'..."
                  : "Describe tu caso con detalle..."
                }
              />
              <button
                className={styles.sendBtn}
                onClick={() => enviar(input)}
                disabled={paso === "procesando" || !input.trim()}
              >
                {paso === "procesando"
                  ? <Loader2 size={18} className={styles.spin} />
                  : <Send size={18} />
                }
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Burbuja({ m }) {
  const esBot = m.de === "bot";
  return (
    <div className={`${styles.msgRow} ${esBot ? styles.rowBot : styles.rowUser}`}>
      {esBot && (
        <div className={styles.botAvatar}>
          <Bot size={16} />
        </div>
      )}
      <div className={`${styles.bubble} ${esBot ? styles.bubbleBot : styles.bubbleUser}`}>
        <p className={styles.bubbleText}>{m.texto}</p>
        <span className={styles.bubbleHora}>{m.hora}</span>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className={`${styles.msgRow} ${styles.rowBot}`}>
      <div className={styles.botAvatar}><Bot size={16} /></div>
      <div className={`${styles.bubble} ${styles.bubbleBot} ${styles.typing}`}>
        <span /><span /><span />
      </div>
    </div>
  );
}

function Chip({ label, value, color, bg, wide }) {
  return (
    <div className={styles.chip2} style={{ gridColumn: wide ? "1/-1" : undefined, background: bg || "#f8fafc" }}>
      <span className={styles.chipLabel}>{label}</span>
      <span className={styles.chipValue} style={{ color }}>{value}</span>
    </div>
  );
}

function BarConfianza({ v }) {
  const pct = Math.round(v * 100);
  return (
    <div className={styles.confBar}>
      <Sparkles size={13} className={styles.sparkleAnim} />
      <span className={styles.chipLabel}>Confianza IA</span>
      <div className={styles.barBg}><div className={styles.barFill} style={{ width: `${pct}%` }} /></div>
      <span className={styles.confNum}>{pct}%</span>
    </div>
  );
}
