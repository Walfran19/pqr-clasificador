import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import { ThemeProvider } from "./context/ThemeContext";
import Chat from "./pages/Chat";
import ConsultarPQR from "./pages/ConsultarPQR";
import AdminPanel from "./pages/AdminPanel";
import Login from "./pages/Login";
import Historial from "./pages/Historial";

function RutaAdmin({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== "admin") return <Navigate to="/chat" replace />;
  return children;
}

function RutaUsuario({ children }) {
  const { usuario } = useAuth();
  return usuario ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <ChatProvider>
      <Routes>
        <Route path="/"          element={<Navigate to="/chat" replace />} />
        <Route path="/chat"      element={<Chat />} />
        <Route path="/consultar" element={<ConsultarPQR />} />
        <Route path="/login"     element={<Login />} />
        <Route path="/historial" element={
          <RutaUsuario>
            <Historial />
          </RutaUsuario>
        } />
        <Route path="/admin" element={
          <RutaAdmin>
            <AdminPanel />
          </RutaAdmin>
        } />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
      </ChatProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
