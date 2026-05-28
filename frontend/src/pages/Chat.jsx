import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Send, Sparkles, CheckCircle2, FileText, Loader2,
  ClipboardList, Search, History, MessageSquare,
  ChevronRight, Plus, MessageCircle,
} from "lucide-react";
import { useAuth }        from "../context/AuthContext";
import { useChatContext } from "../context/ChatContext";
import { radicarPQR, consultarPorEmail } from "../services/pqr.service";
import Navbar from "../components/Navbar";
import styles from "./Chat.module.css";

const PRIORIDAD_COLOR = { Alta: "#f87171", Media: "#fbbf24", Baja: "#4ade80" };
const PRIORIDAD_BG    = { Alta: "#2d080844", Media: "#2d160344", Baja: "#02200a44" };

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
  if (!usuario)        return "nombre";
  if (!usuario.cedula) return "cedula";
  return "caso";
}

function responderFollowup(pregunta, resultado) {
  const txt = pregunta.toLowerCase();
  const c   = resultado.clasificacion;
  const cod = resultado.codigo;

  if (/nuevo|otro caso|otra queja|diferente|adicional/.test(txt)) return null;
  if (/cuándo|cuando|tiempo|demora|días|dias|tarda|plazo|esperar/.test(txt))
    return `Tu caso tiene prioridad ${c.prioridad}, tiempo estimado: ${PLAZOS[c.prioridad] || "5 días hábiles"}. El área de ${c.area_responsable} se pondrá en contacto contigo. Código: ${cod}.`;
  if (/quién|quien|área|area|encarga|responsable|departamento|contactar/.test(txt))
    return `Tu caso fue asignado al área de ${c.area_responsable}. Responden en ${PLAZOS[c.prioridad] || "5 días hábiles"}.`;
  if (/qué sigue|que sigue|próximo|proximo|siguiente|proceso|pasos|ahora/.test(txt))
    return `Proceso:\n\n1. Tu caso ingresó como "Recibida"\n2. El área de ${c.area_responsable} lo revisará\n3. Te darán respuesta formal\n\nConsulta el avance con el código ${cod}.`;
  if (/código|codigo|número|numero|referencia|radicado/.test(txt))
    return `Tu código de radicado es ${cod}. Consúltalo en "Consultar estado" sin iniciar sesión.`;
  if (/prioridad|urgente|urgencia|importante|grave/.test(txt)) {
    const desc = { Alta: "alta urgencia con atención preferencial.", Media: "prioridad media.", Baja: "baja urgencia." };
    return `Prioridad ${c.prioridad}: ${desc[c.prioridad] || "procesado según protocolos."}`;
  }
  return `Tu caso ${cod} está en manos de ${c.area_responsable} con prioridad ${c.prioridad} (${PLAZOS[c.prioridad] || "5 días hábiles"}). ¿Tienes otra duda?`;
}

// ─── Avatar 3D ────────────────────────────────────────────────────────────────

function AvatarIA({ state }) {
  const avClass = styles[`av_${state}`] || "";
  return (
    <div className={`${styles.avContainer} ${avClass}`}>
      <div className={styles.avRing1} />
      <div className={styles.avRing2} />
      <div className={styles.avRing3} />
      <div className={styles.avSphere}>
        <svg viewBox="0 0 200 200" className={styles.avSvg}>
          <defs>
            <radialGradient id="pqr_hg" cx="38%" cy="32%">
              <stop offset="0%"   stopColor="#1e3a5f" />
              <stop offset="100%" stopColor="#060d1a" />
            </radialGradient>
            <radialGradient id="pqr_eg" cx="30%" cy="30%">
              <stop offset="0%"   stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </radialGradient>
            <filter id="pqr_glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Cabeza */}
          <circle cx="100" cy="100" r="90" fill="url(#pqr_hg)" />
          <circle cx="100" cy="100" r="90" fill="none" stroke="#1e3a8a" strokeWidth="1.2" strokeDasharray="10 5" />
          <circle cx="100" cy="100" r="80" fill="none" stroke="#1e3a8a" strokeWidth="0.6" opacity="0.5" />

          {/* Visor */}
          <rect x="24" y="50" width="152" height="88" rx="18" fill="rgba(0,4,16,0.75)" />
          <rect x="24" y="50" width="152" height="88" rx="18" fill="none" stroke="#1e3a8a" strokeWidth="1" />

          {/* Ojo izquierdo */}
          <rect x="36" y="58" width="52" height="36" rx="8" fill="rgba(0,0,0,0.55)" />
          <circle cx="62"  cy="76" r="14" fill="url(#pqr_eg)" filter="url(#pqr_glow)" className={styles.avEye} />
          <circle cx="62"  cy="76" r="6"  fill="#bfdbfe" />
          <circle cx="57"  cy="71" r="2.5" fill="#fff" opacity="0.85" />

          {/* Ojo derecho */}
          <rect x="112" y="58" width="52" height="36" rx="8" fill="rgba(0,0,0,0.55)" />
          <circle cx="138" cy="76" r="14" fill="url(#pqr_eg)" filter="url(#pqr_glow)" className={styles.avEye} />
          <circle cx="138" cy="76" r="6"  fill="#bfdbfe" />
          <circle cx="133" cy="71" r="2.5" fill="#fff" opacity="0.85" />

          {/* Boca — ecualizador */}
          <g className={`${styles.avBars} ${state === "hablando" ? styles.avBarsTalking : ""}`}>
            <rect x="52"  y="108" width="7" height="14" rx="2.5" fill="#3b82f6" className={styles.b1} />
            <rect x="63"  y="104" width="7" height="18" rx="2.5" fill="#3b82f6" className={styles.b2} />
            <rect x="74"  y="110" width="7" height="12" rx="2.5" fill="#3b82f6" className={styles.b3} />
            <rect x="85"  y="106" width="7" height="16" rx="2.5" fill="#3b82f6" className={styles.b4} />
            <rect x="96"  y="108" width="7" height="14" rx="2.5" fill="#3b82f6" className={styles.b5} />
            <rect x="107" y="105" width="7" height="17" rx="2.5" fill="#3b82f6" className={styles.b6} />
            <rect x="118" y="109" width="7" height="13" rx="2.5" fill="#3b82f6" className={styles.b7} />
            <rect x="129" y="107" width="7" height="15" rx="2.5" fill="#3b82f6" className={styles.b8} />
            <rect x="140" y="110" width="7" height="12" rx="2.5" fill="#3b82f6" className={styles.b9} />
          </g>

          {/* Antena */}
          <line x1="100" y1="10" x2="100" y2="22" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="100" cy="8" r="5.5" fill="#60a5fa" className={styles.avAntenna} />

          {/* Detalles laterales */}
          <line x1="10" y1="95"  x2="24" y2="95"  stroke="#1e3a8a" strokeWidth="1.2" opacity="0.7" />
          <line x1="10" y1="105" x2="24" y2="105" stroke="#1e3a8a" strokeWidth="1.2" opacity="0.7" />
          <line x1="176" y1="95"  x2="190" y2="95"  stroke="#1e3a8a" strokeWidth="1.2" opacity="0.7" />
          <line x1="176" y1="105" x2="190" y2="105" stroke="#1e3a8a" strokeWidth="1.2" opacity="0.7" />
          <circle cx="9"   cy="100" r="3" fill="#1e40af" opacity="0.8" />
          <circle cx="191" cy="100" r="3" fill="#1e40af" opacity="0.8" />
        </svg>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Chat() {
  const { usuario } = useAuth();
  const { mensajes, setMensajes, paso, setPaso, datos, setDatos, resultado, setResultado } = useChatContext();

  const [input, setInput]             = useState("");
  const [hablandoActive, setHablando] = useState(false);
  const bottomRef    = useRef(null);
  const inputRef     = useRef(null);
  const prevBotCount = useRef(0);

  const avatarState = paso === "procesando" ? "procesando"
    : hablandoActive     ? "hablando"
    : input.trim()       ? "escuchando"
    : "idle";

  // Detectar mensajes nuevos del bot → activar animación "hablando"
  useEffect(() => {
    if (!mensajes) return;
    const n = mensajes.filter(m => m.de === "bot").length;
    if (n > prevBotCount.current && paso !== "procesando") {
      setHablando(true);
      const t = setTimeout(() => setHablando(false), 3200);
      prevBotCount.current = n;
      return () => clearTimeout(t);
    }
    prevBotCount.current = n;
  }, [mensajes, paso]);

  // Reiniciar conversación siempre al montar (nueva sesión o cambio de cuenta)
  useEffect(() => {
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
    setResultado(null);
    setPaso(pasosIniciales(usuario));
    setDatos({ nombre: usuario?.nombre || "", cedula: usuario?.cedula || "", email: usuario?.email || "" });
    setMensajes(ms);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensajes]);
  useEffect(() => { if (paso && paso !== "procesando") inputRef.current?.focus(); }, [paso, mensajes]);

  function msg(de, texto) { return { de, texto, hora: hora() }; }
  function push(...nuevos) { setMensajes(p => [...p, ...nuevos]); }

  async function enviar(texto) {
    const txt = texto.trim();
    if (!txt || !paso || paso === "procesando") return;
    setInput("");
    push(msg("user", txt));

    if (paso === "nombre") {
      setDatos(d => ({ ...(d || {}), nombre: txt }));
      setPaso("cedula");
      setTimeout(() => push(
        msg("bot", `Gracias, ${txt}.`),
        msg("bot", "Ahora ingresa tu número de cédula.")
      ), 300);
      return;
    }

    if (paso === "cedula") {
      if (!/^\d{5,12}$/.test(txt.replace(/\s/g, ""))) {
        setTimeout(() => push(msg("bot", "Ingresa un número de cédula válido (solo números, 5-12 dígitos).")), 300);
        return;
      }
      setDatos(d => ({ ...(d || {}), cedula: txt.replace(/\s/g, "") }));
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
          msg("bot", "¿Cuál es tu correo electrónico? Te notificaremos cuando haya novedades.")
        ), 300);
      }
      return;
    }

    if (paso === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(txt)) {
        setTimeout(() => push(msg("bot", "Ese correo no es válido. Ingresa un correo correcto.")), 300);
        return;
      }
      const emailLower = txt.toLowerCase();
      setDatos(d => ({ ...(d || {}), email: emailLower }));
      setPaso("caso");
      try {
        const { data } = await consultarPorEmail(emailLower);
        if (data.total > 0) {
          const u = data.pqrs[0];
          const res = data.total === 1
            ? `1 caso registrado con este correo (${u.codigo} — ${u.estado}).`
            : `${data.total} casos. El más reciente: ${u.codigo} — ${u.estado}.`;
          setTimeout(() => push(
            msg("bot", `¡Hola de nuevo! Ya eres usuario registrado en el sistema.`),
            msg("bot", res),
            msg("bot", "¿Quieres radicar un nuevo caso ahora?")
          ), 300);
        } else {
          setTimeout(() => push(
            msg("bot", "Correo registrado."),
            msg("bot", "Cuéntame tu caso con detalle. ¿Qué petición, queja o reclamo tienes?")
          ), 300);
        }
      } catch {
        setTimeout(() => push(
          msg("bot", "Correo registrado."),
          msg("bot", "Cuéntame tu caso con detalle.")
        ), 300);
      }
      return;
    }

    if (paso === "caso") {
      if (txt.length < 10) {
        setTimeout(() => push(msg("bot", "Por favor describe tu caso con más detalle.")), 300);
        return;
      }
      setPaso("procesando");
      setTimeout(() => push(msg("bot", "Evaluando su caso... espere un momento.")), 300);
      try {
        const { data } = await radicarPQR({
          texto:  txt,
          nombre: datos?.nombre || usuario?.nombre,
          cedula: datos?.cedula || usuario?.cedula || undefined,
          email:  datos?.email  || usuario?.email,
        });
        setResultado(data);
        setPaso("listo");
        const c = data.clasificacion;
        setTimeout(() => {
          push(
            msg("bot", `Caso radicado con el código ${data.codigo}.`),
            msg("bot", `${c.tipo} — ${c.categoria}, prioridad ${c.prioridad}.`)
          );
          setTimeout(() => {
            push(msg("bot", "¿Tienes alguna pregunta sobre tu caso, tiempos o el área responsable?"));
            setPaso("followup");
          }, 700);
        }, 400);
      } catch (err) {
        setPaso("caso");
        setTimeout(() => push(msg("bot", err.response?.data?.error || "Error al procesar. Intenta de nuevo.")), 300);
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

  const mostrarChips  = paso === "caso" || paso === "followup";
  const chipsActuales = paso === "followup" ? SUGERENCIAS_FOLLOWUP : SUGERENCIAS;

  if (!mensajes) return null;

  return (
    <div className={styles.page}>
      <Navbar dark />

      <div className={styles.meetLayout}>

        {/* ── Panel del avatar ── */}
        <div className={styles.avatarPanel}>
          <div className={styles.gridBg} />

          <AvatarIA state={avatarState} />

          <div className={styles.avatarInfo}>
            <p className={styles.avatarName}>Asistente PQR</p>
            <div className={styles.avatarStatusRow}>
              <span className={`${styles.statusDot} ${styles[`dot_${avatarState}`] || ""}`} />
              <span className={styles.statusTxt}>
                {avatarState === "idle"        ? "En línea"
                : avatarState === "escuchando" ? "Escuchando..."
                : avatarState === "procesando" ? "Procesando..."
                :                               "Respondiendo..."}
              </span>
            </div>
          </div>

          <div className={styles.channelRow}>
            <a href="https://wa.me/573105260516?text=Hola%2C%20vengo%20a%20dejar%20una%20PQR" target="_blank" rel="noopener noreferrer" className={styles.chWa}>
              <MessageCircle size={13} /> WhatsApp
            </a>
            <a href="https://t.me/SistemaPQR_Bot" target="_blank" rel="noopener noreferrer" className={styles.chTg}>
              <Send size={13} /> Telegram
            </a>
          </div>
        </div>

        {/* ── Panel del chat ── */}
        <div className={styles.chatPanel}>
          <div className={styles.chatHeader}>
            <MessageSquare size={13} className={styles.chatHeaderIcon} />
            <span>Conversación</span>
            {usuario && <span className={styles.chatUser}>{usuario.nombre}</span>}
          </div>

          <div className={styles.messages}>
            {mensajes.map((m, i) => <Burbuja key={i} m={m} />)}
            {paso === "procesando" && <TypingDots />}

            {resultado && (paso === "listo" || paso === "followup") && (
              <div className={styles.resultCard}>
                <div className={styles.resultHeader}>
                  <div className={styles.resultIconWrap}>
                    <ClipboardList size={18} className={styles.resultIcon} />
                  </div>
                  <div>
                    <p className={styles.resultLabel}>Caso radicado</p>
                    <p className={styles.resultCodigo}>{resultado.codigo}</p>
                  </div>
                  {paso === "followup" && (
                    <button className={styles.btnNuevo} onClick={() => {
                      setResultado(null); setPaso("caso");
                      push(msg("bot", "Claro, cuéntame tu nuevo caso."));
                    }}>
                      <Plus size={12} /> Nuevo
                    </button>
                  )}
                </div>
                <div className={styles.resultGrid}>
                  <Chip label="Tipo"      value={resultado.clasificacion.tipo} />
                  <Chip label="Categoría" value={resultado.clasificacion.categoria} />
                  <Chip label="Prioridad" value={resultado.clasificacion.prioridad}
                    color={PRIORIDAD_COLOR[resultado.clasificacion.prioridad]}
                    bg={PRIORIDAD_BG[resultado.clasificacion.prioridad]} />
                  <Chip label="Área responsable" value={resultado.clasificacion.area_responsable} wide />
                </div>
                <BarConfianza v={resultado.clasificacion.confianza} />
                {resultado.clasificacion.respuesta && (
                  <div className={styles.respBox}>
                    <div className={styles.respBoxHead}>
                      <MessageSquare size={12} className={styles.respBoxIcon} />
                      <span>Respuesta institucional</span>
                    </div>
                    <p className={styles.respBoxTxt}>{resultado.clasificacion.respuesta}</p>
                  </div>
                )}
                <div className={styles.resultLinks}>
                  <Link to={`/consultar?codigo=${resultado.codigo}`} className={styles.resultLink}>
                    <Search size={12} /> Consultar estado
                  </Link>
                  {usuario && (
                    <Link to="/historial" className={styles.resultLink}>
                      <History size={12} /> Mi historial
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
                  <ChevronRight size={11} /> {s}
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
                : paso === "followup" ? "Pregunta sobre tu caso..."
                : "Describe tu caso con detalle..."
              }
            />
            <button
              className={styles.sendBtn}
              onClick={() => enviar(input)}
              disabled={paso === "procesando" || !input.trim()}
            >
              {paso === "procesando"
                ? <Loader2 size={17} className={styles.spin} />
                : <Send size={17} />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function Burbuja({ m }) {
  const esBot = m.de === "bot";
  return (
    <div className={`${styles.msgRow} ${esBot ? styles.rowBot : styles.rowUser}`}>
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
      <div className={`${styles.bubble} ${styles.bubbleBot} ${styles.typing}`}>
        <span /><span /><span />
      </div>
    </div>
  );
}

function Chip({ label, value, color, bg, wide }) {
  return (
    <div className={styles.chip2} style={{ gridColumn: wide ? "1/-1" : undefined, background: bg || "rgba(255,255,255,0.05)" }}>
      <span className={styles.chipLabel}>{label}</span>
      <span className={styles.chipValue} style={{ color }}>{value}</span>
    </div>
  );
}

function BarConfianza({ v }) {
  const pct = Math.round(v * 100);
  return (
    <div className={styles.confBar}>
      <Sparkles size={12} className={styles.sparkleAnim} />
      <span className={styles.chipLabel}>Confianza IA</span>
      <div className={styles.barBg}><div className={styles.barFill} style={{ width: `${pct}%` }} /></div>
      <span className={styles.confNum}>{pct}%</span>
    </div>
  );
}
