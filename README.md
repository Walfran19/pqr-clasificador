# Sistema Inteligente de Gestión de PQR con IA

Plataforma web para la clasificación automática de Peticiones, Quejas y Reclamos (PQR) en instituciones educativas colombianas. Utiliza Inteligencia Artificial para analizar el contenido de cada solicitud y clasificarla por tipo, categoría, prioridad, sentimiento y área responsable, con soporte para radicación vía web y WhatsApp.

---

## Tecnologías utilizadas

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite + React Router + lucide-react |
| Backend | Node.js + Express |
| Base de datos | SQLite (better-sqlite3) |
| Inteligencia Artificial | OpenRouter API (LLM) |
| Transcripción de audio | Groq API (Whisper) |
| Autenticación | JWT + bcrypt |
| Notificaciones email | Nodemailer (SMTP) |
| Canal WhatsApp | Baileys (@whiskeysockets/baileys) |

---

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- npm v9 o superior
- Cuenta en [OpenRouter](https://openrouter.ai) para la API key de IA (gratuita)
- Cuenta en [Groq](https://console.groq.com) para transcripción de audios (gratuita, opcional)
- Cuenta SMTP para envío de emails (Gmail, opcional)

---

## Estructura del proyecto

```
pqr-clasificador/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.js       — login, registro, middlewares JWT
│   │   │   └── pqr.controller.js        — lógica de negocio de PQR
│   │   ├── models/
│   │   │   └── database.js              — SQLite, tablas e índices
│   │   ├── routes/
│   │   │   ├── auth.routes.js           — POST /login, /register
│   │   │   └── pqr.routes.js            — endpoints PQR con rate limiting
│   │   └── services/
│   │       ├── classifier.service.js    — clasificación con IA (OpenRouter)
│   │       ├── codigo.service.js        — generación de códigos de radicado
│   │       ├── email.service.js         — correos transaccionales (Nodemailer)
│   │       ├── transcription.service.js — transcripción de audios (Groq/Whisper)
│   │       ├── wa-flow.service.js       — flujo conversacional de WhatsApp
│   │       └── whatsapp.service.js      — conexión WhatsApp (Baileys)
│   ├── .env                             — variables de entorno (no subir a Git)
│   ├── index.js                         — entrada del servidor
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── Navbar.jsx               — barra de navegación global
    │   ├── context/
    │   │   ├── AuthContext.jsx          — estado global de autenticación
    │   │   └── ChatContext.jsx          — estado global del chat
    │   ├── pages/
    │   │   ├── Chat.jsx                 — página principal, interfaz de chat con IA
    │   │   ├── ConsultarPQR.jsx         — consulta por código o cédula
    │   │   ├── AdminPanel.jsx           — panel de gestión (solo admin)
    │   │   ├── Historial.jsx            — historial del usuario autenticado
    │   │   ├── Login.jsx                — login y registro de usuarios
    │   │   └── RadicarPQR.jsx           — formulario alternativo de radicación
    │   ├── services/
    │   │   └── pqr.service.js           — todas las llamadas al backend
    │   ├── App.jsx                      — rutas de la aplicación
    │   └── main.jsx
    ├── .env                             — variables de entorno del frontend
    └── package.json
```

---

## Configuración y ejecución

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd pqr-clasificador
```

### 2. Configurar el Backend

```bash
cd backend
npm install
```

Crea el archivo `backend/.env` con el siguiente contenido:

```env
# Servidor
PORT=3001

# IA — requerido
OPENROUTER_API_KEY=sk-or-...

# Autenticación — requerido
JWT_SECRET=cambia_esto_por_una_clave_larga_y_aleatoria

# Admin por defecto — opcional (si no se configura se genera una contraseña aleatoria)
ADMIN_EMAIL=admin@pqr.edu.co
ADMIN_PASSWORD=admin123

# URL del frontend — requerido para CORS
FRONTEND_URL=http://localhost:5173
APP_URL=http://localhost:5173

# Email SMTP — opcional, el sistema funciona sin esto
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tucorreo@gmail.com
EMAIL_PASS=tu_app_password_de_gmail
EMAIL_FROM="Sistema PQR" <tucorreo@gmail.com>

# Groq (transcripción de audio WhatsApp) — opcional
GROQ_API_KEY=gsk_...
```

> **Nota sobre el email:** Si no configuras `EMAIL_HOST`, el sistema simplemente omite el envío de correos sin romper ninguna funcionalidad.

> **Nota sobre el admin:** Si no configuras `ADMIN_PASSWORD`, se genera una contraseña aleatoria que se muestra en la consola al primer arranque.

Inicia el servidor:

```bash
node index.js
```

Salida esperada:

```
[INFO] Admin creado — email: admin@pqr.edu.co / password: admin123
Servidor corriendo en http://localhost:3001
```

> La base de datos `database.db` se crea automáticamente al primer arranque.

### 3. Configurar el Frontend

Abre una **nueva terminal**:

```bash
cd frontend
npm install
```

Crea el archivo `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api
```

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Salida esperada:

```
VITE v8.x.x  ready in 300ms
➜  Local:   http://localhost:5173/
```

### 4. Abrir la aplicación

Con ambos servidores corriendo abre el navegador en `http://localhost:5173`.

---

## Módulo WhatsApp (opcional)

El sistema permite recibir y clasificar PQR directamente por WhatsApp. Para activarlo:

```bash
cd backend
npm install @whiskeysockets/baileys groq-sdk qrcode-terminal
```

Al iniciar el backend, si Baileys está instalado, aparecerá un código QR en la terminal. Escanéalo desde WhatsApp → Dispositivos vinculados.

El flujo conversacional guía al usuario paso a paso:
1. Solicita nombre, cédula y correo
2. El usuario describe su caso en lenguaje natural
3. La IA lo clasifica y devuelve el código de radicado
4. El usuario puede hacer preguntas de seguimiento sobre su caso
5. Soporta mensajes de voz (transcripción automática con Groq/Whisper)

---

## Rutas de la aplicación

| Ruta | Acceso | Descripción |
|------|--------|-------------|
| `/chat` | Público | Página principal — chat con IA para radicar PQR |
| `/consultar` | Público | Consulta estado por código de radicado o cédula |
| `/login` | Público | Inicio de sesión y registro de usuarios |
| `/historial` | Usuario autenticado | Historial de PQR del usuario |
| `/admin` | Solo admin | Panel de gestión, estadísticas y respuestas |

---

## Endpoints del API

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/api/pqr` | Público | Radicar y clasificar una PQR |
| GET | `/api/pqr/:codigo` | Público | Consultar PQR por código |
| GET | `/api/pqr/cedula/:cedula` | Público | Consultar PQR por cédula |
| GET | `/api/pqr/email/:email` | Público | Verificar casos por correo |
| GET | `/api/pqr/admin/listar` | Admin | Listar todas las PQR con filtros y paginación |
| GET | `/api/pqr/admin/stats` | Admin | Estadísticas del sistema |
| PUT | `/api/pqr/:codigo/estado` | Admin | Cambiar estado de una PQR |
| PUT | `/api/pqr/:codigo/respuesta` | Admin | Escribir respuesta institucional |
| PUT | `/api/pqr/:codigo/aprobar` | Admin | Aprobar respuesta generada por IA |
| GET | `/api/pqr/user/historial` | Usuario | Historial del usuario autenticado |
| POST | `/api/auth/login` | Público | Iniciar sesión |
| POST | `/api/auth/register` | Público | Registrar nuevo usuario |

---

## Credenciales por defecto

| Campo | Valor |
|-------|-------|
| Email admin | admin@pqr.edu.co |
| Contraseña admin | admin123 |

> Configura `ADMIN_EMAIL` y `ADMIN_PASSWORD` en el `.env` antes del primer arranque para usar tus propias credenciales.

---

## Notas importantes

- El backend debe estar corriendo **antes** de iniciar el frontend
- Los archivos `.env` **no deben subirse al repositorio** (están en `.gitignore`)
- Para detener los servidores usa `Ctrl+C` en cada terminal
- El costo de la API de OpenRouter es menor a `$0.001 USD` por clasificación
- La base de datos `database.db` tampoco debe subirse al repositorio

---

## Comandos de referencia

```bash
# Backend
cd backend && node index.js

# Frontend (nueva terminal)
cd frontend && npm run dev
```
