import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listarPQR, cambiarEstadoPQR, obtenerStats } from "../services/pqr.service";
import styles from "./AdminPanel.module.css";

const ESTADOS     = ["Todos", "Recibida", "En proceso", "Cerrada"];
const CATEGORIAS  = ["Todas", "Académico", "Financiero", "Administrativo", "Convivencia", "Tecnológico", "Disciplinario"];
const PRIORIDADES = ["Todas", "Alta", "Media", "Baja"];

const PRIORIDAD_COLOR = { Alta: "#f87171", Media: "#fbbf24", Baja: "#34d399" };
const ESTADO_COLOR    = { Recibida: "#fbbf24", "En proceso": "#4f7cff", Cerrada: "#34d399" };

export default function AdminPanel() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const [pqrs, setPqrs]           = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [filtros, setFiltros]     = useState({ estado: "", categoria: "", prioridad: "" });
  const [seleccionada, setSeleccionada] = useState(null);
  const [vista, setVista]         = useState("lista"); // "lista" | "detalle"

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtros.estado     && filtros.estado     !== "Todos")   params.estado     = filtros.estado;
      if (filtros.categoria  && filtros.categoria  !== "Todas")   params.categoria  = filtros.categoria;
      if (filtros.prioridad  && filtros.prioridad  !== "Todas")   params.prioridad  = filtros.prioridad;

      const [resPqr, resStats] = await Promise.all([listarPQR(params), obtenerStats()]);
      setPqrs(resPqr.data.pqrs);
      setStats(resStats.data);
    } catch {
      // token expirado
      logout();
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [filtros, logout, navigate]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  async function handleCambiarEstado(codigo, estado) {
    await cambiarEstadoPQR(codigo, estado);
    cargarDatos();
    if (seleccionada?.codigo === codigo) {
      setSeleccionada((p) => ({ ...p, estado }));
    }
  }

  function abrirDetalle(pqr) {
    setSeleccionada(pqr);
    setVista("detalle");
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className={styles.page}>
      {/* NAV */}
      <nav className={styles.nav}>
        <span className={styles.navBrand}>PQR · Admin</span>
        <div className={styles.navRight}>
          <span className={styles.navUser}>👤 {usuario?.nombre}</span>
          <button className={styles.btnLogout} onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </nav>

      <div className={styles.wrapper}>
        {/* STATS */}
        {stats && (
          <div className={styles.statsGrid}>
            <StatCard label="Total PQR"  value={stats.total} color="#4f7cff" />
            {stats.porPrioridad.map((p) => (
              <StatCard key={p.prioridad} label={`Prioridad ${p.prioridad}`} value={p.n} color={PRIORIDAD_COLOR[p.prioridad]} />
            ))}
            {stats.porEstado.map((e) => (
              <StatCard key={e.estado} label={e.estado} value={e.n} color={ESTADO_COLOR[e.estado]} />
            ))}
          </div>
        )}

        {vista === "lista" ? (
          <>
            {/* FILTROS */}
            <div className={styles.filtros}>
              <Select label="Estado"    value={filtros.estado}    options={ESTADOS}     onChange={(v) => setFiltros((f) => ({ ...f, estado: v }))} />
              <Select label="Categoría" value={filtros.categoria} options={CATEGORIAS}  onChange={(v) => setFiltros((f) => ({ ...f, categoria: v }))} />
              <Select label="Prioridad" value={filtros.prioridad} options={PRIORIDADES} onChange={(v) => setFiltros((f) => ({ ...f, prioridad: v }))} />
              <button className={styles.btnRefresh} onClick={cargarDatos}>↺ Actualizar</button>
            </div>

            {/* TABLA */}
            {loading ? (
              <div className={styles.centered}><span className={styles.spinner} /></div>
            ) : pqrs.length === 0 ? (
              <div className={styles.empty}>No hay PQR con los filtros seleccionados.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nombre</th>
                      <th>Categoría</th>
                      <th>Prioridad</th>
                      <th>Estado</th>
                      <th>Fecha</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pqrs.map((pqr) => (
                      <tr key={pqr.id} onClick={() => abrirDetalle(pqr)} className={styles.trClickable}>
                        <td className={styles.codigo}>{pqr.codigo}</td>
                        <td>{pqr.nombre}</td>
                        <td>{pqr.categoria}</td>
                        <td>
                          <span className={styles.badge} style={{ color: PRIORIDAD_COLOR[pqr.prioridad], borderColor: PRIORIDAD_COLOR[pqr.prioridad] }}>
                            {pqr.prioridad}
                          </span>
                        </td>
                        <td>
                          <span className={styles.badge} style={{ color: ESTADO_COLOR[pqr.estado], borderColor: ESTADO_COLOR[pqr.estado] }}>
                            {pqr.estado}
                          </span>
                        </td>
                        <td className={styles.fecha}>{new Date(pqr.fecha).toLocaleDateString("es-CO")}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <select
                            className={styles.selectEstado}
                            value={pqr.estado}
                            onChange={(e) => handleCambiarEstado(pqr.codigo, e.target.value)}
                          >
                            <option>Recibida</option>
                            <option>En proceso</option>
                            <option>Cerrada</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          /* DETALLE */
          <Detalle pqr={seleccionada} onVolver={() => setVista("lista")} onCambiarEstado={handleCambiarEstado} />
        )}
      </div>
    </div>
  );
}

/* ── Sub-componentes ── */

function StatCard({ label, value, color }) {
  return (
    <div className={styles.statCard} style={{ borderTopColor: color }}>
      <span className={styles.statValue} style={{ color }}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <div className={styles.selectWrap}>
      <label>{label}</label>
      <select value={value || options[0]} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Detalle({ pqr, onVolver, onCambiarEstado }) {
  return (
    <div className={styles.detalle}>
      <button className={styles.btnVolver} onClick={onVolver}>← Volver a la lista</button>

      <div className={styles.detalleCard}>
        <div className={styles.detalleHeader}>
          <div>
            <span className={styles.detalleCodigo}>{pqr.codigo}</span>
            <span className={styles.badge} style={{ color: ESTADO_COLOR[pqr.estado], borderColor: ESTADO_COLOR[pqr.estado], marginLeft: 12 }}>
              {pqr.estado}
            </span>
          </div>
          <select
            className={styles.selectEstado}
            value={pqr.estado}
            onChange={(e) => onCambiarEstado(pqr.codigo, e.target.value)}
          >
            <option>Recibida</option>
            <option>En proceso</option>
            <option>Cerrada</option>
          </select>
        </div>

        <div className={styles.detalleGrid}>
          <InfoRow label="Nombre"   value={pqr.nombre} />
          <InfoRow label="Correo"   value={pqr.email} />
          <InfoRow label="Fecha"    value={new Date(pqr.fecha).toLocaleString("es-CO")} />
          <InfoRow label="Tipo"     value={pqr.tipo} />
          <InfoRow label="Categoría" value={pqr.categoria} />
          <InfoRow label="Prioridad" value={pqr.prioridad} color={PRIORIDAD_COLOR[pqr.prioridad]} />
          <InfoRow label="Sentimiento" value={pqr.sentimiento} />
          <InfoRow label="Área"     value={pqr.area} />
          <InfoRow label="Confianza IA" value={`${Math.round(pqr.confianza * 100)}%`} />
        </div>

        <div className={styles.resumenBox}>
          <span className={styles.miniLabel}>Resumen IA</span>
          <p>{pqr.resumen}</p>
        </div>

        <div className={styles.textoBox}>
          <span className={styles.miniLabel}>Texto original</span>
          <p>{pqr.texto}</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, color }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.miniLabel}>{label}</span>
      <span style={{ color, fontWeight: color ? 600 : 400 }}>{value}</span>
    </div>
  );
}