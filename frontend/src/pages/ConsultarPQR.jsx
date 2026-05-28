import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, Hash, CreditCard, CheckCircle2, Clock,
  AlertTriangle, MapPin, FileText, MessageSquare,
  ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { consultarPQR, consultarPorCedula } from "../services/pqr.service";
import Navbar from "../components/Navbar";
import styles from "./ConsultarPQR.module.css";

const PRIORIDAD = {
  Alta:  { color: "#dc2626", bg: "#fef2f2" },
  Media: { color: "#d97706", bg: "#fffbeb" },
  Baja:  { color: "#059669", bg: "#f0fdf4" },
};
const ESTADO = {
  Recibida:    { color: "#d97706", bg: "#fffbeb" },
  "En proceso":{ color: "#2563eb", bg: "#eff6ff" },
  Cerrada:     { color: "#059669", bg: "#f0fdf4" },
};

export default function ConsultarPQR() {
  const [searchParams] = useSearchParams();
  const [modo, setModo]        = useState("codigo");
  const [query, setQuery]      = useState("");
  const [resultado, setResult] = useState(null);
  const [loading, setLoading]  = useState(false);
  const [error, setError]      = useState("");

  function reset() { setResult(null); setError(""); }

  const buscarCodigo = useCallback(async (codigo) => {
    reset();
    setLoading(true);
    try {
      const { data } = await consultarPQR(codigo.toUpperCase());
      setResult({ tipo: "unico", pqr: data.pqr });
    } catch (err) {
      setError(err.response?.data?.error || "No se encontraron resultados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const codigo = searchParams.get("codigo");
    if (codigo) {
      setModo("codigo");
      setQuery(codigo.toUpperCase());
      buscarCodigo(codigo);
    }
  }, []);

  async function buscar(e) {
    e.preventDefault();
    if (!query.trim()) return;
    reset();
    setLoading(true);
    try {
      if (modo === "codigo") {
        const { data } = await consultarPQR(query.trim().toUpperCase());
        setResult({ tipo: "unico", pqr: data.pqr });
      } else {
        const { data } = await consultarPorCedula(query.trim());
        setResult({ tipo: "lista", pqrs: data.pqrs, total: data.total });
      }
    } catch (err) {
      setError(err.response?.data?.error || "No se encontraron resultados.");
    } finally {
      setLoading(false);
    }
  }

  function cambiarModo(m) { setModo(m); setQuery(""); reset(); }

  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.wrapper}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderIcon}>
            <Search size={24} />
          </div>
          <div>
            <h1>Consultar estado</h1>
            <p>Ingresa el código de radicado o tu número de cédula para ver tus casos.</p>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.modeTabs}>
            <button
              className={`${styles.modeTab} ${modo === "codigo" ? styles.modeTabActive : ""}`}
              onClick={() => cambiarModo("codigo")}
            >
              <Hash size={16} />
              Por código de radicado
            </button>
            <button
              className={`${styles.modeTab} ${modo === "cedula" ? styles.modeTabActive : ""}`}
              onClick={() => cambiarModo("cedula")}
            >
              <CreditCard size={16} />
              Por número de cédula
            </button>
          </div>

          <form onSubmit={buscar} className={styles.searchForm}>
            <div className={styles.searchInputWrap}>
              {modo === "codigo"
                ? <Hash size={16} className={styles.searchIcon} />
                : <CreditCard size={16} className={styles.searchIcon} />
              }
              <input
                className={styles.searchInput}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={modo === "codigo" ? "Ej: PQR-2026-4821" : "Ej: 1023456789"}
                required
                autoFocus
              />
            </div>
            <button type="submit" className={styles.btnBuscar} disabled={loading}>
              {loading
                ? <Loader2 size={18} className={styles.spin} />
                : <><Search size={16} /> Buscar</>
              }
            </button>
          </form>

          {error && (
            <div className={styles.errorBox}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {resultado?.tipo === "unico" && <TarjetaPQR pqr={resultado.pqr} />}

        {resultado?.tipo === "lista" && (
          <div>
            <div className={styles.listHeader}>
              <FileText size={16} />
              <h2>
                {resultado.total} caso{resultado.total !== 1 ? "s" : ""} encontrado{resultado.total !== 1 ? "s" : ""}
              </h2>
            </div>
            <div className={styles.lista}>
              {resultado.pqrs.map(p => <TarjetaPQR key={p.id} pqr={p} compacta />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TarjetaPQR({ pqr, compacta }) {
  const [expandida, setExpandida] = useState(!compacta);
  const est = ESTADO[pqr.estado]     || { color: "#64748b", bg: "#f8fafc" };
  const pri = PRIORIDAD[pqr.prioridad] || {};

  return (
    <div className={`${styles.resultCard} ${expandida ? styles.resultCardOpen : ""}`}>
      <div
        className={styles.cardHead}
        onClick={() => compacta && setExpandida(v => !v)}
        style={{ cursor: compacta ? "pointer" : "default" }}
      >
        <div className={styles.cardHeadLeft}>
          <span className={styles.codigoBadge}>{pqr.codigo}</span>
          <span className={styles.fechaText}>
            {new Date(pqr.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        </div>
        <div className={styles.cardHeadRight}>
          <span className={styles.pill} style={{ color: est.color, background: est.bg }}>{pqr.estado}</span>
          <span className={styles.pill} style={{ color: pri.color, background: pri.bg }}>{pqr.prioridad}</span>
          {compacta && (
            expandida
              ? <ChevronUp size={15} className={styles.chevron} />
              : <ChevronDown size={15} className={styles.chevron} />
          )}
        </div>
      </div>

      {expandida && (
        <div className={styles.cardBody}>
          <div className={styles.estadoBanner} style={{ background: est.bg, borderColor: est.color + "44" }}>
            <div className={styles.estadoItem}>
              <Clock size={14} style={{ color: est.color }} />
              <div>
                <p className={styles.estadoLabel}>Estado actual</p>
                <p className={styles.estadoValor} style={{ color: est.color }}>{pqr.estado}</p>
              </div>
            </div>
            <div className={styles.estadoItem}>
              <MapPin size={14} className={styles.estadoIconMuted} />
              <div>
                <p className={styles.estadoLabel}>Área responsable</p>
                <p className={styles.estadoValor2}>{pqr.area}</p>
              </div>
            </div>
          </div>

          <div className={styles.infoGrid}>
            <InfoItem label="Nombre"     value={pqr.nombre} />
            {pqr.cedula && <InfoItem label="Cédula" value={pqr.cedula} />}
            <InfoItem label="Correo"     value={pqr.email} />
            <InfoItem label="Fecha"      value={new Date(pqr.fecha).toLocaleString("es-CO")} />
            <InfoItem label="Tipo"       value={pqr.tipo} />
            <InfoItem label="Categoría"  value={pqr.categoria} />
            <InfoItem label="Prioridad"  value={pqr.prioridad} color={pri.color} />
            <InfoItem label="Sentimiento" value={pqr.sentimiento} />
          </div>

          {pqr.resumen && (
            <div className={styles.seccion}>
              <p className={styles.seccionLabel}>Resumen del caso</p>
              <p className={styles.seccionTexto}>{pqr.resumen}</p>
            </div>
          )}

          {pqr.respuesta && (
            <div className={styles.respuestaBox}>
              <div className={styles.respuestaHeader}>
                <MessageSquare size={15} className={styles.respuestaIcon} />
                <p className={styles.seccionLabel} style={{ margin: 0 }}>Respuesta institucional</p>
                {pqr.respuesta_aprobada
                  ? <span className={styles.badgeAprobada}>Oficial</span>
                  : <span className={styles.badgePendiente}>Preliminar IA</span>
                }
              </div>
              <p className={styles.respuestaTexto}>{pqr.respuesta}</p>
            </div>
          )}

          <details className={styles.detalles}>
            <summary>Ver texto original del caso</summary>
            <p>{pqr.texto}</p>
          </details>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value, color }) {
  return (
    <div className={styles.infoItem}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValor} style={{ color }}>{value}</span>
    </div>
  );
}
