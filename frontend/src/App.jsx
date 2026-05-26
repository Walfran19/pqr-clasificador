import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import RadicarPQR from "./pages/RadicarPQR";
import ConsultarPQR from "./pages/ConsultarPQR";
import AdminPanel from "./pages/AdminPanel";
import Login from "./pages/Login";

// Protege rutas que requieren autenticación
function RutaProtegida({ children }) {
  const { usuario } = useAuth();
  return usuario ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/"        element={<RadicarPQR />} />
        <Route path="/consultar" element={<ConsultarPQR />} />
        <Route path="/login"   element={<Login />} />
        <Route path="/admin"   element={
          <RutaProtegida>
            <AdminPanel />
          </RutaProtegida>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}