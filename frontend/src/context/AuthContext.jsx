import { createContext, useContext, useState } from "react";
import { loginUsuario, registrarUsuario } from "../services/pqr.service";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem("usuario");
    return guardado ? JSON.parse(guardado) : null;
  });

  function _guardarSesion(data) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("usuario", JSON.stringify(data.usuario));
    setUsuario(data.usuario);
  }

  async function login(email, password) {
    const { data } = await loginUsuario({ email, password });
    _guardarSesion(data);
    return data.usuario;
  }

  async function register(nombre, email, password, cedula) {
    const { data } = await registrarUsuario({ nombre, cedula: cedula || undefined, email, password });
    _guardarSesion(data);
    return data.usuario;
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}