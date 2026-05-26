import { useState } from "react";
import { Link } from "react-router-dom";
import { consultarPQR } from "../services/pqr.service";
import styles from "./ConsultarPQR.module.css";

const ESTADO_COLOR = {
  Recibida:    { color: "#fbbf24", bg: "rgba(251,191,36,0.08)"  },
  "En proceso": { color: "#4f7cff", bg: "rgba(79,124,255,0.08)" },
  Cerrada:     { color: "#34d399", bg: "rgba(52,211,153,0.08)"  },
};

const PRIORIDAD_COLOR = { Alta: "#f87171", Media: "#fbbf24", Baja: "#34d399" };

export default function ConsultarPQR() {
  const [codigo, setCodigo]   = useState("");
  const [pqr, setPqr]         = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleBuscar(e) {
    e.preventDefault();
    if (!codigo.trim()) return;
    setError("");
    setPqr(null);
    setLoading(true);
    try {
      const { data } = await consultarPQR(codigo.trim().toUpperCase());
      setPqr(data.pqr);
    } catch (err) {
      setError(err.response?.data?.error || "No se encontró una PQR con ese código.");
    } finally {
      setLoading(false);
    }
  }

  const estadoInfo = pqr ? ESTADO_COLOR[pqr.estado] || {} : {};

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.navBrand}>PQR · IA</Link>
        <div className={styles.navLinks}>
          <Link to="/">Radicar PQR</Link>
          <Link to="/login" className={styles.navAdmin}>Panel admin</Link>
        </div>
      </nav>

      <div className={styles.wrapper}>
        <header className={styles.header}>
          <span className={styles.tag}>Consulta de estado</span>
          <h1>¿Cómo va <em>tu caso</em>?</h1>
          <p>Ingresa el código que recibiste al radicar tu PQR.</p>
        </header>

        {/* Buscador */}
        <div className={styles.card}>
          <form onSubmit={handleBuscar} className={styles.searchForm}>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="PQR-2026-0000"
              className={styles.searchInput}
              required
            />
            <button type="submit" className={styles.btnBuscar} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : "Buscar"}
            </button>
          </form>
          {error && <p className={styles.error}>{error}</p>}
        </div>

        {/* Resultado */}
        {pqr && (
          <div className={styles.card} style={{ animation: "fadeUp 0.4s ease" }}>

            {/* Estado */}
            <div className={styles.estadoRow} style={{ background: estadoInfo.bg, borderColor: estadoInfo.color }}>
              <span className={styles.estadoLabel}>Estado actual</span>
              <span className={styles.estadoValue} style={{ color: estadoInfo.color }}>{pqr.estado}</span>
            </div>

            {/* Info básica */}
            <div className={styles.infoGrid}>
              <InfoItem label="Código"    value={pqr.codigo} />
              <InfoItem label="Fecha"     value={new Date(pqr.fecha).toLocaleString("es-CO")} />
              <InfoItem label="Nombre"    value={pqr.nombre} />
              <InfoItem label="Correo"    value={pqr.email} />
            </div>

            {/* Resumen */}
            <div className={styles.resumenBox}>
              <span className={styles.miniLabel}>Resumen IA</span>
              <p>{pqr.resumen}</p>
            </div>

            {/* Clasificación */}
            <div className={styles.badges}>
              <Badge label="Tipo"       value={pqr.tipo} />
              <Badge label="Categoría"  value={pqr.categoria} />
              <Badge label="Prioridad"  value={pqr.prioridad} color={PRIORIDAD_COLOR[pqr.prioridad]} />
              <Badge label="Sentimiento" value={pqr.sentimiento} />
              <Badge label="Área responsable" value={pqr.area} wide />
            </div>

            {/* Texto original */}
            <details className={styles.detalles}>
              <summary>Ver texto original</summary>
              <p>{pqr.texto}</p>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className={styles.infoItem}>
      <span className={styles.miniLabel}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Badge({ label, value, color, wide }) {
  return (
    <div className={styles.badge} style={{ gridColumn: wide ? "1 / -1" : undefined }}>
      <span className={styles.miniLabel}>{label}</span>
      <span style={{ color, fontWeight: 600 }}>{value}</span>
    </div>
  );
}