import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList, BarChart2, RefreshCw, ArrowLeft,
  CheckCircle2, Clock, Settings2, AlertTriangle,
  MessageSquare, Loader2, CheckCheck,
  Pencil, X, Send, LayoutDashboard, TrendingUp,
  Users, AlertCircle,
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
  Recibida:     <Clock size={14} />,
  "En proceso": <Settings2 size={14} />,
  Cerrada:      <CheckCircle2 size={14} />,
};

const CAT_COLORS = {
  "Académico":      "#2563eb",
  "Financiero":     "#7c3aed",
  "Administrativo": "#0891b2",
  "Convivencia":    "#d97706",
  "Tecnológico":    "#059669",
  "Disciplinario":  "#dc2626",
};

export default function AdminPanel() {
  const { logout } = useAuth();
  const navigate   = useNavigate();

  const [pqrs, setPqrs]                 = useState([]);
  const [stats, setStats]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [filtros, setFiltros]           = useState({ estado: "", categoria: "", prioridad: "" });
  const [seleccionada, setSeleccionada] = useState(null);
  const [vista, setVista]               = useState("dashboard");
  const [paginacion, setPaginacion]     = useState({ page: 1, totalPages: 1, total: 0 });

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

        {/* Tab nav */}
        <div className={styles.tabNav}>
          <button
            className={`${styles.tabBtn} ${vista === "dashboard" ? styles.tabActive : ""}`}
            onClick={() => setVista("dashboard")}
          >
            <LayoutDashboard size={15} /> Dashboard
          </button>
          <button
            className={`${styles.tabBtn} ${vista === "lista" || vista === "detalle" ? styles.tabActive : ""}`}
            onClick={() => setVista("lista")}
          >
            <ClipboardList size={15} /> PQRs
          </button>
          <button
            className={styles.btnRefreshTab}
            onClick={() => cargarDatos(true)}
            disabled={refreshing}
            title="Actualizar datos"
          >
            <RefreshCw size={14} className={refreshing ? styles.spin : ""} />
          </button>
        </div>

        {/* Dashboard */}
        {vista === "dashboard" && (
          loading ? (
            <div className={styles.centered}><Loader2 size={28} className={styles.spin} /></div>
          ) : (
            <DashboardView stats={stats} onVerLista={() => setVista("lista")} />
          )
        )}

        {/* Lista */}
        {vista === "lista" && (
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
              <div className={styles.centered}><Loader2 size={28} className={styles.spin} /></div>
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
                        <tr
                          key={pqr.id}
                          onClick={() => { setSeleccionada(pqr); setVista("detalle"); }}
                          className={styles.trClickable}
                        >
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
                    <span className={styles.paginaInfo}>Página {paginacion.page} de {paginacion.totalPages}</span>
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
        )}

        {/* Detalle */}
        {vista === "detalle" && (
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

/* ── Dashboard ── */

function DashboardView({ stats, onVerLista }) {
  if (!stats) return null;

  const recibidas     = stats.porEstado.find(e => e.estado === "Recibida")?.n    || 0;
  const enProceso     = stats.porEstado.find(e => e.estado === "En proceso")?.n  || 0;
  const cerradas      = stats.porEstado.find(e => e.estado === "Cerrada")?.n     || 0;
  const altaPrioridad = stats.porPrioridad.find(p => p.prioridad === "Alta")?.n  || 0;
  const sinRespuesta  = stats.sinRespuesta || 0;

  // Fill last 30 days (including days with 0)
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (29 - i));
    return d.toISOString().split("T")[0];
  });
  const dayMap = Object.fromEntries((stats.porDia || []).map(d => [d.dia, d.n]));
  const trendData = days.map(dia => ({ dia, n: dayMap[dia] || 0 }));

  const totalPri = stats.porPrioridad.reduce((s, p) => s + p.n, 0);
  const priColors = { Alta: "#dc2626", Media: "#d97706", Baja: "#059669" };

  return (
    <div className={styles.dash}>
      {/* KPI row */}
      <div className={styles.dashKpis}>
        <KpiCard label="Total PQR"      value={stats.total}   color="#2563eb" sub="registradas"        icon={<ClipboardList size={20} />} />
        <KpiCard label="Recibidas"      value={recibidas}     color="#d97706" sub="pendientes"          icon={<Clock size={20} />} />
        <KpiCard label="En proceso"     value={enProceso}     color="#2563eb" sub="activas"             icon={<Settings2 size={20} />} />
        <KpiCard label="Cerradas"       value={cerradas}      color="#059669" sub="resueltas"           icon={<CheckCircle2 size={20} />} />
        <KpiCard label="Alta prioridad" value={altaPrioridad} color="#dc2626" sub="urgentes"            icon={<AlertTriangle size={20} />} />
        <KpiCard label="Sin respuesta"  value={sinRespuesta}  color="#7c3aed" sub="requieren atención"  icon={<AlertCircle size={20} />} />
      </div>

      {/* Charts grid */}
      <div className={styles.dashGrid}>
        {/* Trend */}
        <div className={styles.dashCard}>
          <div className={styles.dashCardHeader}>
            <TrendingUp size={15} className={styles.dashCardIcon} />
            <span>Tendencia últimos 30 días</span>
          </div>
          <TrendChart data={trendData} />
        </div>

        {/* Categorías */}
        <div className={styles.dashCard}>
          <div className={styles.dashCardHeader}>
            <BarChart2 size={15} className={styles.dashCardIcon} />
            <span>Por categoría</span>
          </div>
          <div className={styles.catBars}>
            {[...stats.porCategoria].sort((a, b) => b.n - a.n).map(cat => {
              const pct = stats.total ? Math.round((cat.n / stats.total) * 100) : 0;
              const color = CAT_COLORS[cat.categoria] || "#64748b";
              return (
                <div key={cat.categoria} className={styles.catBar}>
                  <div className={styles.catBarLabel}>
                    <span>{cat.categoria}</span>
                    <span style={{ color }} className={styles.catBarVal}>{cat.n}</span>
                  </div>
                  <div className={styles.catBarTrack}>
                    <div className={styles.catBarFill} style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recientes */}
        <div className={styles.dashCard}>
          <div className={styles.dashCardHeader}>
            <Users size={15} className={styles.dashCardIcon} />
            <span>Últimas PQR</span>
            <button className={styles.dashCardBtn} onClick={onVerLista}>Ver todas →</button>
          </div>
          <table className={styles.recentTable}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Prioridad</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {(stats.recientes || []).map(pqr => {
                const pri = PRIORIDAD[pqr.prioridad] || {};
                const est = ESTADO[pqr.estado]       || {};
                return (
                  <tr key={pqr.codigo}>
                    <td><span className={styles.codigoBadge}>{pqr.codigo}</span></td>
                    <td className={styles.tdNombre}>{pqr.nombre}</td>
                    <td>{pqr.categoria}</td>
                    <td><span className={styles.pill} style={{ color: pri.color, background: pri.bg }}>{pqr.prioridad}</span></td>
                    <td>
                      <span className={styles.pillIcon} style={{ color: est.color, background: est.bg }}>
                        {ESTADO_ICON[pqr.estado]}{pqr.estado}
                      </span>
                    </td>
                    <td className={styles.tdMuted}>{new Date(pqr.fecha).toLocaleDateString("es-CO")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Prioridades donut */}
        <div className={styles.dashCard}>
          <div className={styles.dashCardHeader}>
            <AlertTriangle size={15} className={styles.dashCardIcon} />
            <span>Por prioridad</span>
          </div>
          <DonutChart data={stats.porPrioridad} total={totalPri} colors={priColors} keyField="prioridad" />
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, color, sub, icon }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    if (!value) { setDisplayed(0); return; }
    let cur = 0;
    const step = Math.max(1, Math.ceil(value / 20));
    const timer = setInterval(() => {
      cur = Math.min(cur + step, value);
      setDisplayed(cur);
      if (cur >= value) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiIcon} style={{ color, background: color + "18" }}>{icon}</div>
      <div className={styles.kpiBody}>
        <span className={styles.kpiValue} style={{ color }}>{displayed}</span>
        <span className={styles.kpiLabel}>{label}</span>
        <span className={styles.kpiSub}>{sub}</span>
      </div>
    </div>
  );
}

function TrendChart({ data }) {
  const max = Math.max(...data.map(d => d.n), 1);
  const W = 560, H = 90, padL = 24, padR = 8, padT = 8, padB = 20;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW   = chartW / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.trendSvg}>
      {[0, 0.5, 1].map(f => (
        <g key={f}>
          <line
            x1={padL} y1={padT + (1 - f) * chartH}
            x2={W - padR} y2={padT + (1 - f) * chartH}
            stroke="var(--border)" strokeWidth="0.5"
          />
          <text x={padL - 4} y={padT + (1 - f) * chartH + 3} textAnchor="end" fontSize="8" fill="var(--text-4)">
            {Math.round(f * max)}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const x = padL + i * barW;
        const h = (d.n / max) * chartH;
        const y = padT + chartH - h;
        return (
          <rect
            key={d.dia}
            x={x + 0.5} y={h > 0 ? y : padT + chartH - 1}
            width={Math.max(barW - 1.5, 1)} height={Math.max(h, 1)}
            fill={d.n > 0 ? "var(--accent)" : "var(--border)"}
            opacity={d.n > 0 ? "0.8" : "0.3"}
            rx="2"
          >
            <title>{d.dia}: {d.n} PQR</title>
          </rect>
        );
      })}

      {data.map((d, i) => {
        if (i % 7 !== 0 && i !== data.length - 1) return null;
        return (
          <text key={d.dia} x={padL + i * barW + barW / 2} y={H - 2} textAnchor="middle" fontSize="8" fill="var(--text-4)">
            {d.dia.slice(5)}
          </text>
        );
      })}
    </svg>
  );
}

function DonutChart({ data, total, colors, keyField }) {
  if (!total) return <p className={styles.noData}>Sin datos aún</p>;

  let cum = 0;
  const segments = data.map(d => {
    const pct = (d.n / total) * 100;
    const seg = { key: d[keyField], pct, from: cum, color: colors[d[keyField]] || "#64748b", n: d.n };
    cum += pct;
    return seg;
  });

  const gradient = segments
    .map(s => `${s.color} ${s.from.toFixed(1)}% ${(s.from + s.pct).toFixed(1)}%`)
    .join(", ");

  return (
    <div className={styles.donutWrap}>
      <div className={styles.donutOuter} style={{ background: `conic-gradient(${gradient})` }}>
        <div className={styles.donutHole}>
          <span className={styles.donutTotal}>{total}</span>
          <span className={styles.donutTotalLabel}>total</span>
        </div>
      </div>
      <div className={styles.donutLegend}>
        {segments.map(s => (
          <div key={s.key} className={styles.donutLegendItem}>
            <span className={styles.donutDot} style={{ background: s.color }} />
            <span className={styles.donutLegendLabel}>{s.key}</span>
            <span className={styles.donutLegendVal} style={{ color: s.color }}>{s.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Shared sub-components ── */

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

  const [editando, setEditando]   = useState(false);
  const [textoResp, setTextoResp] = useState(pqr.respuesta || "");
  const [guardando, setGuardando] = useState(false);
  const [aprobando, setAprobando] = useState(false);

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

        <div>
          <p className={styles.seccionLabel}>Resumen IA</p>
          <p className={styles.seccionTexto}>{pqr.resumen}</p>
        </div>

        <div>
          <p className={styles.seccionLabel}>Texto original del ciudadano</p>
          <p className={styles.textoOriginal}>{pqr.texto}</p>
        </div>

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
              {pqr.respuesta
                ? <p className={styles.respuestaTextoAdmin}>{pqr.respuesta}</p>
                : <p className={styles.respuestaVacia}>Sin respuesta todavía. Usa el editor para escribir una.</p>
              }
              {!aprobada && pqr.respuesta && (
                <button className={styles.btnAprobar} onClick={handleAprobar} disabled={aprobando}>
                  {aprobando ? <Loader2 size={14} className={styles.spin} /> : <CheckCheck size={14} />}
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
                  {guardando ? <Loader2 size={14} className={styles.spin} /> : <Send size={14} />}
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
