import { createContext, useContext, useState } from "react";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [mensajes,  setMensajes]  = useState(null); // null = no inicializado
  const [paso,      setPaso]      = useState(null);
  const [datos,     setDatos]     = useState(null);
  const [resultado, setResultado] = useState(null);

  function limpiarChat() {
    setMensajes(null);
    setPaso(null);
    setDatos(null);
    setResultado(null);
  }

  return (
    <ChatContext.Provider value={{ mensajes, setMensajes, paso, setPaso, datos, setDatos, resultado, setResultado, limpiarChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  return useContext(ChatContext);
}
