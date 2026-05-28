import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList, BarChart2, RefreshCw, ArrowLeft,
  CheckCircle2, Clock, Settings2, AlertTriangle,
  MessageSquare, Loader2, CreditCard, CheckCheck,
  Pencil, X, Send,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { listarPQR, cambiarEstadoPQR, obtenerStats, actualizarRespuestaPQR, aprobarRespuestaIA } from "../services/pqr.service";
import Navbar from "../components/Navbar";
import styles from "./AdminPanel.module.css";

const ESTADOS     = ["Todos", "Recibida", "En proceso", "Cerrada"];
const CATEGORIAS  = ["Todas", "Académico", "Financiero", "Administrativo", "Convivencia", "Tecnológico", "Disciplinario"];
const PRIORIDADES = ["Todas", "Alta", "Media", "Baja"];

const PRIORIDAD = { Alta: { color: "#dc2626", bg: "#fef2f2" }, Media: { color: "#d97706", bg: "#fffbeb" }, Baja: { color: "#059669", bg: "#f0fdf4" } };
const ESTADO    = { Recibida: { color: "#d97706", bg: "#fffbeb" }, "En proceso": { color: "#2563eb", bg: "#eff6ff" }, Cerrada: { color: "#059669", bg: "#f0fdf4" } };

const ESTADO_ICON = {
  Recibida:    <Clock size={14} />,
  "En proceso": <Settings2 size={14} />,
  Cerrada:     <CheckCircle2 size={14} />,
};

export default function AdminPanel() {
  const { logout } = useAuth();
  const navigate   = useNavigate();

  const [pqrs, setPqrs]               = useState([]);
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [filtros, setFiltros]         = useState({ estado: "", categoria: "", prioridad: "" });
  const [seleccionada, setSeleccionada] = useState(null);
  const [vista, setVista]             = useState("lista");
  const [paginacion, setPaginacion]   = useState({ page: 1, totalPages: 1, total: 0 });

  const cargarDatos = useCallback(async (silent = false, page = paginacion.page) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const params = {};
      if (filtros.estado    && filtros.estado    !== "Todos")  params.estado    = filtros.estado;
      if (filtros.categoria && filtros.categoria !== "Todas")  params.categoria = filtros.categoria;
      if (filtros.prioridad && filtros.prioridad !== "Todas")  params.prioridad = filtros.prioridad;

      const [resPqr, resStats] = await Promise.all([listarPQR(params, page), obtenerStats()]);
      setPqrs(resPqr.data.pqrs);
      setPaginacion({ page: resPqr.data.page, totalPages: resPqr.data.totalPages, total: resPqr.data.total });
      setStats(resStats.data);
    } catch {
      logout(); navigate("/login");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtros, logout, navigate, paginacion.page]);

  useEffect(() => { cargarDatos(false, 1); }, [filtros]);
  useEffect(() => { cargarDatos(); }, []);

  async function handleCambiarEstado(codigo, estado) {
    await cambiarEstadoPQR(codigo, estado);
    cargarDatos(true);
    if (seleccionada?.codigo === codigo) setSeleccionada(p => ({ ...p, estado }));
  }

  async function handleAprobarRespuesta(codigo) {
    await aprobarRespuestaIA(codigo);
    cargarDatos(true);
    if (seleccionada?.codigo === codigo) setSeleccionada(p => ({ ...p, respuesta_aprobada: 1 }));
  }

  async function handleGuardarRespuesta(codigo, respuesta) {
    await actualizarRespuestaPQR(codigo, respuesta);
    cargarDatos(true);
    if (seleccionada?.codigo === codigo) setSeleccionada(p => ({ ...p, respuesta, respuesta_aprobada: 1 }));
  }

  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.wrapper}>
        {/* Stats */}
        {stats && (
          <div className={styles.statsGrid}>
            <StatCard
              label="Total PQR" value={stats.total} color="#2563eb"
              icon={<ClipboardList size={18} />}
            />
            {stats.porPrioridad.map(p => (
              <StatCard
                key={p.prioridad}
                label={`Prioridad ${p.prioridad}`} value={p.n}
                color={PRIORIDAD[p.prioridad]?.color || "#64748b"}
                icon={<AlertTriangle size={18} />}
              />
            ))}
            {stats.porEstado.map(e => (
              <StatCard
                key={e.estado}
                label={e.estado} value={e.n}
                color={ESTADO[e.estado]?.color || "#64748b"}
                icon={ESTADO_ICON[e.estado] || <BarChart2 size={18} />}
              />
            ))}
          </div>
        )}

        {vista === "lista" ? (
          <>
            <div className={styles.toolbar}>
              <div className={styles.filtros}>
                <FiltroSelect label="Estado"    value={filtros.estado}    options={ESTADOS}     onChange={v => setFiltros(f => ({ ...f, estado: v }))} />
                <FiltroSelect label="Categoría" value={filtros.categoria} options={CATEGORIAS}  onChange={v => setFiltros(f => ({ ...f, categoria: v }))} />
                <FiltroSelect label="Prioridad" value={filtros.prioridad} options={PRIORIDADES} onChange={v => setFiltros(f => ({ ...f, prioridad: v }))} />
              </div>
              <button className={styles.btnRefresh} onClick={() => cargarDatos(true)} disabled={refreshing}>
                <RefreshCw size={14} className={refreshing ? styles.spin : ""} />
                Actualizar
              </button>
            </div>

            {loading ? (
              <div className={styles.centered}>
                <Loader2 size={28} className={styles.spin} />
              </div>
            ) : pqrs.length === 0 ? (
              <div className={styles.empty}>No hay PQR con los filtros seleccionados.</div>
            ) : (
              <div className={styles.tableWrap}>
                <div className={styles.tableCount}>{paginacion.total} resultado{paginacion.total !== 1 ? "s" : ""}</div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nombre</th>
                      <th>Cédula</th>
                      <th>Categoría</th>
                      <th>Prioridad</th>
                      <th>Estado</th>
                      <th>Fecha</th>
                      <th>Cambiar estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pqrs.map(pqr => {
                      const pri = PRIORIDAD[pqr.prioridad] || {};
                      const est = ESTADO[pqr.estado]       || {};
                      return (
                        <tr key={pqr.id} onClick={() => { setSeleccionada(pqr); setVista("detalle"); }} className={styles.trClickable}>
                          <td><span className={styles.codigoBadge}>{pqr.codigo}</span></td>
                          <td className={styles.tdNombre}>{pqr.nombre}</td>
                          <td className={styles.tdMuted}>{pqr.cedula || "—"}</td>
                          <td>{pqr.categoria}</td>
                          <td><span className={styles.pill} style={{ color: pri.color, background: pri.bg }}>{pqr.prioridad}</span></td>
                          <td>
                            <span className={styles.pillIcon} style={{ color: est.color, background: est.bg }}>
                              {ESTADO_ICON[pqr.estado]}{pqr.estado}
                            </span>
                          </td>
                          <td className={styles.tdMuted}>{new Date(pqr.fecha).toLocaleDateString("es-CO")}</td>
                          <td onClick={e => e.stopPropagation()}>
                            <select className={styles.selectEstado} value={pqr.estado} onChange={e => handleCambiarEstado(pqr.codigo, e.target.value)}>
                              <option>Recibida</option>
                              <option>En proceso</option>
                              <option>Cerrada</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {paginacion.totalPages > 1 && (
                  <div className={styles.paginacion}>
                    <button
                      className={styles.btnPagina}
                      onClick={() => cargarDatos(false, paginacion.page - 1)}
                      disabled={paginacion.page <= 1 || refreshing}
                    >
                      ← Anterior
                    </button>
                    <span className={styles.paginaInfo}>
                      Página {paginacion.page} de {paginacion.totalPages}
                    </span>
                    <button
                      className={styles.btnPagina}
                      onClick={() => cargarDatos(false, paginacion.page + 1)}
                      disabled={paginacion.page >= paginacion.totalPages || refreshing}
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <DetallePanel
            pqr={seleccionada}
            onVolver={() => setVista("lista")}
            onCambiarEstado={handleCambiarEstado}
            onAprobar={handleAprobarRespuesta}
            onGuardarRespuesta={handleGuardarRespuesta}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className={styles.statCard} style={{ borderTopColor: color }}>
      <div className={styles.statRow}>
        <span className={styles.statIcon} style={{ color }}>{icon}</span>
        <span className={styles.statValue} style={{ color }}>{value}</span>
      </div>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function FiltroSelect({ label, value, options, onChange }) {
  return (
    <div className={styles.filtroWrap}>
      <label>{label}</label>
      <select value={value || options[0]} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function DetallePanel({ pqr, onVolver, onCambiarEstado, onAprobar, onGuardarRespuesta }) {
  const pri = PRIORIDAD[pqr.prioridad] || {};
  const est = ESTADO[pqr.estado]       || {};

  const [editando, setEditando]         = useState(false);
  const [textoResp, setTextoResp]       = useState(pqr.respuesta || "");
  const [guardando, setGuardando]       = useState(false);
  const [aprobando, setAprobando]       = useState(false);

  async function handleAprobar() {
    setAprobando(true);
    await onAprobar(pqr.codigo);
    setAprobando(false);
  }

  async function handleGuardar() {
    if (!textoResp.trim()) return;
    setGuardando(true);
    await onGuardarRespuesta(pqr.codigo, textoResp);
    setGuardando(false);
    setEditando(false);
  }

  const aprobada = Boolean(pqr.respuesta_aprobada);

  return (
    <div className={styles.detalle}>
      <div className={styles.detalleToolbar}>
        <button className={styles.btnVolver} onClick={onVolver}>
          <ArrowLeft size={15} /> Volver a la lista
        </button>
        <div className={styles.detalleActions}>
          <span className={styles.detalleLabel}>Cambiar estado:</span>
          <select className={styles.selectEstado} value={pqr.estado} onChange={e => onCambiarEstado(pqr.codigo, e.target.value)}>
            <option>Recibida</option>
            <option>En proceso</option>
            <option>Cerrada</option>
          </select>
        </div>
      </div>

      <div className={styles.detalleCard}>
        <div className={styles.detalleHead}>
          <span className={styles.detalleCodigo}>{pqr.codigo}</span>
          <div className={styles.detallePills}>
            <span className={styles.pill}     style={{ color: pri.color, background: pri.bg }}>Prioridad {pqr.prioridad}</span>
            <span className={styles.pillIcon} style={{ color: est.color, background: est.bg }}>{ESTADO_ICON[pqr.estado]}{pqr.estado}</span>
          </div>
        </div>

        <div className={styles.detalleGrid}>
          <InfoItem label="Nombre"       value={pqr.nombre} />
          <InfoItem label="Cédula"       value={pqr.cedula || "No registrada"} />
          <InfoItem label="Correo"       value={pqr.email} />
          <InfoItem label="Fecha"        value={new Date(pqr.fecha).toLocaleString("es-CO")} />
          <InfoItem label="Tipo"         value={pqr.tipo} />
          <InfoItem label="Categoría"    value={pqr.categoria} />
          <InfoItem label="Prioridad"    value={pqr.prioridad} color={pri.color} />
          <InfoItem label="Sentimiento"  value={pqr.sentimiento} />
          <InfoItem label="Área"         value={pqr.area} wide />
          <InfoItem label="Confianza IA" value={`${Math.round(pqr.confianza * 100)}%`} />
        </div>

        <div className={styles.seccion}>
          <p className={styles.seccionLabel}>Resumen IA</p>
          <p className={styles.seccionTexto}>{pqr.resumen}</p>
        </div>

        <div className={styles.seccion}>
          <p className={styles.seccionLabel}>Texto original del ciudadano</p>
          <p className={styles.textoOriginal}>{pqr.texto}</p>
        </div>

        {/* Gestión de respuesta */}
        <div className={styles.respuestaGestion}>
          <div className={styles.respuestaGestionHeader}>
            <div className={styles.respuestaGestionTitulo}>
              <MessageSquare size={15} className={styles.respuestaIcon} />
              <span>Respuesta al ciudadano</span>
            </div>
            <div className={styles.respuestaGestionBadges}>
              {aprobada
                ? <span className={styles.badgeAprobada}><CheckCheck size={12} /> Aprobada</span>
                : <span className={styles.badgePendiente}>Pendiente de revisión</span>
              }
              {!editando && (
                <button className={styles.btnEditar} onClick={() => { setEditando(true); setTextoResp(pqr.respuesta || ""); }}>
                  <Pencil size={13} /> Editar
                </button>
              )}
            </div>
          </div>

          {!editando ? (
            <>
              {pqr.respuesta ? (
                <p className={styles.respuestaTextoAdmin}>{pqr.respuesta}</p>
              ) : (
                <p className={styles.respuestaVacia}>Sin respuesta todavía. Usa el editor para escribir una.</p>
              )}
              {!aprobada && pqr.respuesta && (
                <button className={styles.btnAprobar} onClick={handleAprobar} disabled={aprobando}>
                  {aprobando
                    ? <Loader2 size={14} className={styles.spin} />
                    : <CheckCheck size={14} />
                  }
                  Aprobar respuesta IA
                </button>
              )}
            </>
          ) : (
            <div className={styles.editorWrap}>
              <textarea
                className={styles.editorTextarea}
                value={textoResp}
                onChange={e => setTextoResp(e.target.value)}
                rows={6}
                placeholder="Escribe la respuesta institucional para este ciudadano..."
                autoFocus
              />
              <div className={styles.editorActions}>
                <button className={styles.btnCancelar} onClick={() => setEditando(false)}>
                  <X size={14} /> Cancelar
                </button>
                <button className={styles.btnGuardar} onClick={handleGuardar} disabled={guardando || !textoResp.trim()}>
                  {guardando
                    ? <Loader2 size={14} className={styles.spin} />
                    : <Send size={14} />
                  }
                  Guardar y aprobar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, color, wide }) {
  return (
    <div className={styles.infoItem} style={{ gridColumn: wide ? "1/-1" : undefined }}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValor} style={{ color }}>{value}</span>
    </div>
  );
}
