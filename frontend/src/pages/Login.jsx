import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LayoutGrid, Check, Search, ClipboardList, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import styles from "./Login.module.css";

export default function Login() {
  const { login, register, usuario } = useAuth();
  const navigate = useNavigate();
  const [modo, setModo] = useState("login");
  const [form, setForm] = useState({ nombre: "", cedula: "", email: "", password: "", confirmar: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (usuario) {
    navigate(usuario.rol === "admin" ? "/admin" : "/chat", { replace: true });
    return null;
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function cambiarModo(m) {
    setModo(m);
    setError("");
    setForm({ nombre: "", cedula: "", email: "", password: "", confirmar: "" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (modo === "register" && form.password !== form.confirmar) {
      return setError("Las contraseñas no coinciden.");
    }
    setLoading(true);
    try {
      let u;
      if (modo === "login") {
        u = await login(form.email, form.password);
      } else {
        u = await register(form.nombre, form.email, form.password, form.cedula);
      }
      navigate(u.rol === "admin" ? "/admin" : "/chat", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  const esLogin = modo === "login";

  return (
    <div className={styles.page}>
      <div className={styles.brand}>
        <div className={styles.brandInner}>
          <LayoutGrid size={28} className={styles.brandIcon} />
          <span className={styles.brandName}>SistemaPQR</span>
        </div>
        <p className={styles.brandTagline}>Plataforma institucional de gestión de Peticiones, Quejas y Reclamos</p>
        <div className={styles.brandFeatures}>
          <div className={styles.feature}><Sparkles     size={15} className={styles.featureIcon} /> Clasificación automática con IA</div>
          <div className={styles.feature}><Search       size={15} className={styles.featureIcon} /> Consulta por código o cédula</div>
          <div className={styles.feature}><ClipboardList size={15} className={styles.featureIcon} /> Historial de tus casos</div>
          <div className={styles.feature}><Check        size={15} className={styles.featureIcon} /> Respuestas institucionales inmediatas</div>
        </div>
      </div>

      <div className={styles.formPanel}>
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>{esLogin ? "Iniciar sesión" : "Crear cuenta"}</h2>
          <p className={styles.formSub}>
            {esLogin ? "Accede a tu historial de casos" : "Regístrate para llevar un registro de tus PQR"}
          </p>

          <div className={styles.tabs}>
            <button className={`${styles.tab} ${esLogin ? styles.tabActive : ""}`} onClick={() => cambiarModo("login")}>
              Iniciar sesión
            </button>
            <button className={`${styles.tab} ${!esLogin ? styles.tabActive : ""}`} onClick={() => cambiarModo("register")}>
              Crear cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {!esLogin && (
              <div className={styles.field}>
                <label>Nombre completo <span className={styles.req}>*</span></label>
                <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Juan Pérez García" required autoFocus />
              </div>
            )}
            {!esLogin && (
              <div className={styles.field}>
                <label>Número de cédula</label>
                <input name="cedula" value={form.cedula} onChange={handleChange} placeholder="Ej: 1023456789" />
                <span className={styles.hint}>Opcional — permite consultar tus casos sin cuenta</span>
              </div>
            )}
            <div className={styles.field}>
              <label>Correo electrónico <span className={styles.req}>*</span></label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="tu@correo.com" required autoFocus={esLogin} />
            </div>
            <div className={styles.field}>
              <label>Contraseña <span className={styles.req}>*</span></label>
              <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Mínimo 6 caracteres" required />
            </div>
            {!esLogin && (
              <div className={styles.field}>
                <label>Confirmar contraseña <span className={styles.req}>*</span></label>
                <input name="confirmar" type="password" value={form.confirmar} onChange={handleChange} placeholder="Repite tu contraseña" required />
              </div>
            )}

            {error && <div className={styles.error}>{error}</div>}

            <button type="submit" className={styles.btn} disabled={loading}>
              {loading
                ? <Loader2 size={18} className={styles.spin} />
                : esLogin ? "Ingresar" : "Crear mi cuenta"
              }
            </button>
          </form>

          <div className={styles.footer}>
            <Link to="/chat" className={styles.footerLink}>← Continuar sin cuenta</Link>
          </div>

          {esLogin && (
            <div className={styles.adminHint}>
              <span>Panel admin:</span> <code>admin@pqr.edu.co</code> / <code>admin123</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
