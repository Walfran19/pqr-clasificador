import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  LayoutGrid, MessageSquare, Search, ClipboardList,
  ShieldCheck, LogOut, LogIn, User, Sun, Moon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import styles from "./Navbar.module.css";

export default function Navbar({ dark = false }) {
  const { usuario, logout } = useAuth();
  const { theme, toggle }   = useTheme();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className={`${styles.bar} ${dark ? styles.barDark : ""}`}>
      {/* Brand */}
      <Link to="/chat" className={styles.brand}>
        <LayoutGrid size={20} className={styles.brandIcon} />
        <span>SistemaPQR</span>
      </Link>

      {/* Nav links */}
      <nav className={styles.nav}>
        <NavItem to="/chat"      icon={<MessageSquare size={15} />} label="Chat" />
        <NavItem to="/consultar" icon={<Search size={15} />}        label="Consultar" />
        {usuario && (
          <NavItem to="/historial" icon={<ClipboardList size={15} />} label="Mi historial" />
        )}
        {usuario?.rol === "admin" && (
          <NavItem to="/admin" icon={<ShieldCheck size={15} />} label="Admin" />
        )}
      </nav>

      {/* User / auth */}
      <div className={styles.actions}>
        <button className={styles.themeBtn} onClick={toggle} title={theme === "dark" ? "Modo claro" : "Modo oscuro"}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        {usuario ? (
          <>
            <div className={styles.userChip}>
              <User size={13} />
              <span>{usuario.nombre.split(" ")[0]}</span>
            </div>
            <button className={styles.btnLogout} onClick={handleLogout}>
              <LogOut size={14} />
              <span>Salir</span>
            </button>
          </>
        ) : (
          <Link to="/login" className={styles.btnLogin}>
            <LogIn size={14} />
            <span>Iniciar sesión</span>
          </Link>
        )}
      </div>
    </header>
  );
}


function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
