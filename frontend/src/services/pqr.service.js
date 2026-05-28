import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const radicarPQR          = (datos)          => api.post("/pqr", datos);
export const consultarPQR        = (codigo)         => api.get(`/pqr/${codigo}`);
export const consultarPorCedula  = (cedula)         => api.get(`/pqr/cedula/${cedula}`);
export const consultarPorEmail   = (email)          => api.get(`/pqr/email/${encodeURIComponent(email)}`);
export const listarPQR           = (filtros = {}, page = 1, limit = 20) => api.get("/pqr/admin/listar", { params: { ...filtros, page, limit } });
export const cambiarEstadoPQR    = (codigo, estado)    => api.put(`/pqr/${codigo}/estado`, { estado });
export const actualizarRespuestaPQR = (codigo, respuesta) => api.put(`/pqr/${codigo}/respuesta`, { respuesta });
export const aprobarRespuestaIA     = (codigo)            => api.put(`/pqr/${codigo}/aprobar`);
export const obtenerStats        = ()               => api.get("/pqr/admin/stats");
export const obtenerHistorial    = ()               => api.get("/pqr/user/historial");
export const loginUsuario        = (credenciales)   => api.post("/auth/login", credenciales);
export const registrarUsuario    = (datos)          => api.post("/auth/register", datos);

// Alias de compatibilidad con AdminPanel
export const loginAdmin = loginUsuario;