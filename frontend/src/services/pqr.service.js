import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3001/api",
});

// Agrega el token automáticamente en cada petición si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Responsabilidad única: radicar una PQR
export const radicarPQR = (datos) => api.post("/pqr", datos);

// Responsabilidad única: consultar PQR por código
export const consultarPQR = (codigo) => api.get(`/pqr/${codigo}`);

// Responsabilidad única: listar todas las PQR (admin)
export const listarPQR = (filtros = {}) => api.get("/pqr/admin/listar", { params: filtros });

// Responsabilidad única: cambiar estado de una PQR (admin)
export const cambiarEstadoPQR = (codigo, estado) =>
  api.put(`/pqr/${codigo}/estado`, { estado });

// Responsabilidad única: obtener estadísticas (admin)
export const obtenerStats = () => api.get("/pqr/admin/stats");

// Responsabilidad única: login del admin
export const loginAdmin = (credenciales) => api.post("/auth/login", credenciales);