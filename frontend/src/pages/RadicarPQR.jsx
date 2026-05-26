import { useState } from "react";
import { Link } from "react-router-dom";
import { radicarPQR } from "../services/pqr.service";
import styles from "./RadicarPQR.module.css";

const EJEMPLOS = [
  "No puedo descargar mi recibo de matrícula y necesito pagar hoy",
  "Un compañero me está molestando constantemente y el profesor no hace nada",
  "Mi nota aparece incorrecta en el sistema académico",
  "No puedo acceder al campus virtual desde hace tres días",
  "Quisiera saber los horarios de atención de la biblioteca",
];

const PRIORIDAD_COLOR = { Alta: "#f87171", Media: "#fbbf24", Baja: "#34d399" };
const PRIORIDAD_BG    = { Alta: "rgba(248,113,113,0.08)", Media: "rgba(251,191,36,0.08)", Baja: "rgba(52,211,153,0.08)" };

export default function RadicarPQR() {
  const [form, setForm]         = useState({ nombre: "", email: "", texto: "" });
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function usarEjemplo(texto) {
    setForm((f) => ({ ...f, texto }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResultado(null);
    setLoading(true);
    try {
      const { data } = await radicarPQR(form);
      setResultado(data);
    } catch (err) {
      setError(err.response?.data?.error || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* NAV */}
      <nav className={styles.nav}>
        <span className={styles.navBrand}>PQR · IA</span>
        <div className={styles.navLinks}>
          <Link to="/consultar">Consultar estado</Link>
          <Link to="/login" className={styles.navAdmin}>Panel admin</Link>
        </div>
      </nav>

      <div className={styles.wrapper}>
        {/* HEADER */}
        <header className={styles.header}>
          <span className={styles.tag}>Clasificador IA</span>
          <h1>Radica tu <em>PQR</em></h1>
          <p>Describe tu caso y la inteligencia artificial lo clasificará automáticamente.</p>
        </header>

        {/* FORM */}
        <div className={styles.card}>
          <form onSubmit={handleSubmit}>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label>Nombre completo</label>
                <input
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Tu nombre"
                  required
                />
              </div>
              <div className={styles.field}>
                <label>Correo electrónico</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="tu@correo.com"
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>Describe tu caso</label>
              <textarea
                name="texto"
                value={form.texto}
                onChange={handleChange}
                placeholder="Explica con detalle tu petición, queja o reclamo..."
                required
                rows={5}
              />
            </div>

            {/* Ejemplos rápidos */}
            <div className={styles.chips}>
              {EJEMPLOS.map((e) => (
                <button key={e} type="button" className={styles.chip} onClick={() => usarEjemplo(e)}>
                  {e.slice(0, 40)}…
                </button>
              ))}
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.btnSubmit} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : "Clasificar con IA"}
            </button>
          </form>
        </div>

        {/* RESULTADO */}
        {resultado && (
          <div className={styles.card} style={{ animation: "fadeUp 0.4s ease" }}>
            <div className={styles.resultHeader}>
              <span className={styles.dot} />
              <span>Clasificación completada</span>
            </div>

            <div className={styles.codigoBox}>
              <span className={styles.codigoLabel}>Código de radicado</span>
              <span className={styles.codigo}>{resultado.codigo}</span>
              <span className={styles.codigoHint}>Guárdalo para consultar el estado de tu PQR</span>
            </div>

            <p className={styles.resumen}>{resultado.clasificacion.resumen}</p>

            <div className={styles.badges}>
              <Badge label="Tipo"       value={resultado.clasificacion.tipo} />
              <Badge label="Categoría"  value={resultado.clasificacion.categoria} />
              <Badge
                label="Prioridad"
                value={resultado.clasificacion.prioridad}
                color={PRIORIDAD_COLOR[resultado.clasificacion.prioridad]}
                bg={PRIORIDAD_BG[resultado.clasificacion.prioridad]}
              />
              <Badge label="Sentimiento"    value={resultado.clasificacion.sentimiento} />
              <Badge label="Área responsable" value={resultado.clasificacion.area_responsable} wide />
            </div>

            <ConfBar confianza={resultado.clasificacion.confianza} />
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ label, value, color, bg, wide }) {
  return (
    <div className={styles.badge} style={{ gridColumn: wide ? "1 / -1" : undefined, background: bg }}>
      <span className={styles.badgeLabel}>{label}</span>
      <span className={styles.badgeValue} style={{ color }}>{value}</span>
    </div>
  );
}

function ConfBar({ confianza }) {
  const pct = Math.round(confianza * 100);
  return (
    <div className={styles.confBar}>
      <span className={styles.badgeLabel}>Nivel de confianza</span>
      <div className={styles.barBg}>
        <div className={styles.barFill} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.confNum}>{pct}%</span>
    </div>
  );
}