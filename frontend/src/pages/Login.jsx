import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./Login.module.css";

export default function Login() {
  const { login, usuario } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  // Si ya está logueado, redirige al panel
  if (usuario) {
    navigate("/admin", { replace: true });
    return null;
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Credenciales incorrectas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.wrapper}>
        <Link to="/" className={styles.back}>← Volver al inicio</Link>

        <div className={styles.card}>
          <span className={styles.tag}>Acceso administrativo</span>
          <h1>Panel de <em>administración</em></h1>
          <p>Ingresa tus credenciales para gestionar las PQR.</p>

          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label>Correo electrónico</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="admin@pqr.edu.co"
                required
                autoFocus
              />
            </div>
            <div className={styles.field}>
              <label>Contraseña</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : "Ingresar"}
            </button>
          </form>

          <p className={styles.hint}>
            Credenciales por defecto: <code>admin@pqr.edu.co</code> / <code>admin123</code>
          </p>
        </div>
      </div>
    </div>
  );
}