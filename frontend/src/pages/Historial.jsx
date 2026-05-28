import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ClipboardList, Plus, Inbox, Settings2, CheckCircle2,
  Mail, MessageSquare, ChevronDown, ChevronUp,
  Loader2, CreditCard,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { obtenerHistorial } from "../services/pqr.service";
import Navbar from "../components/Navbar";
import styles from "./Historial.module.css";

const PRIORIDAD = { Alta: { color: "#dc2626", bg: "#fef2f2" }, Media: { color: "#d97706", bg: "#fffbeb" }, Baja: { color: "#059669", bg: "#f0fdf4" } };
const ESTADO    = { Recibida: { color: "#d97706", bg: "#fffbeb" }, "En proceso": { color: "#2563eb", bg: "#eff6ff" }, Cerrada: { color: "#059669", bg: "#f0fdf4" } };

export default function Historial() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [pqrs, setPqrs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandida, setExp]   = useState(null);

  useEffect(() => {
    obtenerHistorial()
      .then(({ data }) => setPqrs(data.pqrs))
      .catch(() => { logout(); navigate("/login"); })
      .finally(() => setLoading(false));
  }, []);

  const total     = pqrs.length;
  const recibidas = pqrs.filter(p => p.estado === "Recibida").length;
  const enProceso = pqrs.filter(p => p.estado === "En proceso").length;
  const cerradas  = pqrs.filter(p => p.estado === "Cerrada").length;

  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.wrapper}>
        <div className={styles.pageHeader}>
          <div>
            <h1>Mi historial de PQR</h1>
            <p>Todos tus casos radicados, su estado y las respuestas institucionales.</p>
          </div>
          <Link to="/chat" className={styles.btnNuevo}>
            <Plus size={15} /> Nuevo caso
          </Link>
        </div>

        {!loading && total > 0 && (
          <div className={styles.statsRow}>
            <StatCard label="Total"       value={total}     color="#2563eb" icon={<ClipboardList size={20} />} />
            <StatCard label="Recibidas"   value={recibidas} color="#d97706" icon={<Inbox size={20} />} />
            <StatCard label="En proceso"  value={enProceso} color="#2563eb" icon={<Settings2 size={20} className={enProceso > 0 ? styles.spinSlow : ""} />} />
            <StatCard label="Cerradas"    value={cerradas}  color="#059669" icon={<CheckCircle2 size={20} />} />
          </div>
        )}

        {loading && (
          <div className={styles.center}>
            <Loader2 size={28} className={styles.spin} />
            <p>Cargando tus casos...</p>
          </div>
        )}

        {!loading && total === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIconWrap}>
              <Inbox size={40} className={styles.emptyIcon} />
            </div>
            <h3>Aún no tienes casos radicados</h3>
            <p>Cuando radiques tu primera PQR, aparecerá aquí.</p>
            <Link to="/chat" className={styles.btnNuevo}>
              <Plus size={15} /> Radicar mi primera PQR
            </Link>
          </div>
        )}

        {!loading && total > 0 && (
          <div className={styles.lista}>
            {pqrs.map(pqr => {
              const est  = ESTADO[pqr.estado]      || { color: "#64748b", bg: "#f8fafc" };
              const pri  = PRIORIDAD[pqr.prioridad] || {};
              const open = expandida === pqr.id;

              return (
                <div key={pqr.id} className={`${styles.card} ${open ? styles.cardOpen : ""}`}>
                  <div className={styles.cardHead} onClick={() => setExp(open ? null : pqr.id)}>
                    <div className={styles.cardHeadLeft}>
                      <span className={styles.codigo}>{pqr.codigo}</span>
                      <span className={styles.fecha}>
                        {new Date(pqr.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <div className={styles.cardMid}>
                      <span className={styles.resumenPrev}>{pqr.resumen || pqr.texto?.slice(0, 60) + "…"}</span>
                    </div>
                    <div className={styles.cardRight}>
                      <span className={styles.pill} style={{ color: pri.color, background: pri.bg }}>{pqr.prioridad}</span>
                      <span className={styles.pill} style={{ color: est.color, background: est.bg }}>{pqr.estado}</span>
                      {open
                        ? <ChevronUp size={15} className={styles.chevron} />
                        : <ChevronDown size={15} className={styles.chevron} />
                      }
                    </div>
                  </div>

                  {open && (
                    <div className={styles.cardBody}>
                      <div className={styles.infoGrid}>
                        {pqr.cedula && <InfoItem icon={<CreditCard size={13}/>} label="Cédula"          value={pqr.cedula} />}
                        <InfoItem label="Tipo"            value={pqr.tipo} />
                        <InfoItem label="Categoría"       value={pqr.categoria} />
                        <InfoItem label="Prioridad"       value={pqr.prioridad} color={pri.color} />
                        <InfoItem label="Sentimiento"     value={pqr.sentimiento} />
                        <InfoItem label="Área responsable" value={pqr.area} wide />
                      </div>

                      <div className={styles.seccion}>
                        <p className={styles.seccionLabel}>Tu mensaje</p>
                        <p className={styles.textoOriginal}>{pqr.texto}</p>
                      </div>

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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIconWrap} style={{ background: color + "18", color }}>
        {icon}
      </div>
      <div>
        <p className={styles.statValue} style={{ color }}>{value}</p>
        <p className={styles.statLabel}>{label}</p>
      </div>
    </div>
  );
}

function InfoItem({ label, value, color, wide, icon }) {
  return (
    <div className={styles.infoItem} style={{ gridColumn: wide ? "1/-1" : undefined }}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValor} style={{ color }}>{value}</span>
    </div>
  );
}
