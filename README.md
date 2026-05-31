# Sistema Inteligente de Gestión de PQR con IA

Plataforma web para la clasificación automática de Peticiones, Quejas y Reclamos (PQR) en instituciones educativas colombianas. Utiliza Inteligencia Artificial para analizar el contenido de cada solicitud y clasificarla por tipo, categoría, prioridad, sentimiento y área responsable. Soporta radicación vía web, WhatsApp y Telegram.

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
| Canal Telegram | node-telegram-bot-api |

---

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- npm v9 o superior
- Cuenta en [OpenRouter](https://openrouter.ai) — API key de IA (gratuita)
- Cuenta en [Groq](https://console.groq.com) — transcripción de audios (gratuita, opcional)
- Cuenta SMTP — envío de emails (Gmail recomendado, opcional)
- Bot de Telegram creado con @BotFather (opcional)

---

## Estructura del proyecto

```
pqr-clasificador/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.js         — login, registro, middlewares JWT
│   │   │   └── pqr.controller.js          — lógica de negocio de PQR
│   │   ├── models/
│   │   │   └── database.js                — SQLite, tablas, índices y migraciones
│   │   ├── routes/
│   │   │   ├── auth.routes.js             — POST /login, /register
│   │   │   └── pqr.routes.js              — endpoints PQR con rate limiting
│   │   └── services/
│   │       ├── classifier.service.js      — clasificación con IA (OpenRouter)
│   │       ├── codigo.service.js          — generación de códigos de radicado
│   │       ├── email.service.js           — correos transaccionales (Nodemailer)
│   │       ├── transcription.service.js   — transcripción de audios (Groq/Whisper)
│   │       ├── wa-flow.service.js         — flujo conversacional de WhatsApp
│   │       ├── whatsapp.service.js        — conexión WhatsApp (Baileys)
│   │       ├── telegram-flow.service.js   — flujo conversacional de Telegram
│   │       └── telegram.service.js        — conexión bot de Telegram
│   ├── .env                               — variables de entorno (no subir a Git)
│   ├── index.js                           — entrada del servidor
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx                 — barra de navegación global con toggle de tema
    │   │   └── Navbar.module.css
    │   ├── context/
    │   │   ├── AuthContext.jsx            — estado global de autenticación
    │   │   ├── ChatContext.jsx            — estado global del chat
    │   │   └── ThemeContext.jsx           — modo claro/oscuro con persistencia
    │   ├── pages/
    │   │   ├── Chat.jsx                   — página principal, interfaz de chat con IA
    │   │   ├── Chat.module.css
    │   │   ├── ConsultarPQR.jsx           — consulta por código o cédula
    │   │   ├── ConsultarPQR.module.css
    │   │   ├── AdminPanel.jsx             — panel de gestión (solo admin)
    │   │   ├── AdminPanel.module.css
    │   │   ├── Historial.jsx              — historial del usuario autenticado
    │   │   ├── Historial.module.css
    │   │   ├── Login.jsx                  — login y registro de usuarios
    │   │   ├── Login.module.css
    │   │   ├── RadicarPQR.jsx             — formulario alternativo de radicación
    │   │   └── RadicarPQR.module.css
    │   ├── services/
    │   │   └── pqr.service.js             — todas las llamadas al backend
    │   ├── theme.css                      — variables CSS para modo claro y oscuro
    │   ├── App.jsx                        — rutas y providers de la aplicación
    │   └── main.jsx
    ├── .env                               — variables de entorno del frontend
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
# ── Servidor ──────────────────────────────────────────
PORT=3001
FRONTEND_URL=http://localhost:5173
APP_URL=http://localhost:5173

# ── IA — requerido ────────────────────────────────────
OPENROUTER_API_KEY=sk-or-...

# ── Autenticación — requerido ─────────────────────────
JWT_SECRET=cambia_esto_por_una_clave_larga_y_aleatoria

# ── Admin por defecto — opcional ──────────────────────
# Si no se configura se genera una contraseña aleatoria
ADMIN_EMAIL=admin@pqr.edu.co
ADMIN_PASSWORD=admin123

# ── Email SMTP — opcional ─────────────────────────────
# El sistema funciona sin esto, solo omite el envío
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tucorreo@gmail.com
EMAIL_PASS=tu_app_password_de_gmail
EMAIL_FROM="Sistema PQR" <tucorreo@gmail.com>

# ── Groq (transcripción de audio) — opcional ──────────
GROQ_API_KEY=gsk_...

# ── Telegram — opcional ───────────────────────────────
TELEGRAM_BOT_TOKEN=7123456789:AAF...

# ── Canales habilitados — opcional ────────────────────
# Cambiar a false para deshabilitar sin desinstalar
WHATSAPP_ENABLED=true
TELEGRAM_ENABLED=true
```

Inicia el servidor:

```bash
node index.js
```

Salida esperada al primer arranque:

```
[INFO] Admin creado — email: admin@pqr.edu.co / password: admin123
[Telegram] ✓ Bot iniciado correctamente
[WhatsApp] Escanea este QR con tu celular...
Servidor corriendo en http://localhost:3001
```

> La base de datos `database.db` se crea automáticamente. Si solo quieres la web sin canales de mensajería, pon `WHATSAPP_ENABLED=false` y `TELEGRAM_ENABLED=false`.

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

### 4. Abrir la aplicación

Con ambos servidores corriendo abre el navegador en:

```
http://localhost:5173
```

---

## ¿Cómo obtener cada variable de entorno?

### OPENROUTER_API_KEY
1. Ve a [openrouter.ai](https://openrouter.ai) e inicia sesión
2. Menú izquierdo → **Keys** → **Create Key**
3. Copia la key que empieza con `sk-or-v1-...`
4. Los modelos con `:free` al final no tienen costo

### JWT_SECRET
No necesitas ningún servicio. Es una cadena larga que tú defines:
```
JWT_SECRET=pqr_sistema_educativo_2026_clave_super_secreta
```

### EMAIL_PASS (Gmail)
No uses tu contraseña de Gmail directamente — Gmail la bloquea. Necesitas una **contraseña de aplicación**:
1. Ve a [myaccount.google.com](https://myaccount.google.com)
2. Seguridad → **Verificación en dos pasos** (debe estar activa)
3. Busca **Contraseñas de aplicaciones**
4. App: Correo / Dispositivo: Otro → escribe `PQR Sistema`
5. Copia la contraseña de 16 caracteres **sin espacios**

### GROQ_API_KEY
1. Ve a [console.groq.com](https://console.groq.com) e inicia sesión con Google
2. Menú izquierdo → **API Keys** → **Create API Key**
3. Copia la key que empieza con `gsk_...`

### TELEGRAM_BOT_TOKEN
1. Abre Telegram y busca **@BotFather**
2. Escribe `/newbot`
3. Ponle un nombre: `Sistema PQR`
4. Ponle un username que termine en `bot`: `sistpqr_bot`
5. BotFather te entrega el token

---

## Módulo WhatsApp

Al arrancar el backend con `WHATSAPP_ENABLED=true` aparece un QR en la terminal. Escanéalo desde **WhatsApp → Dispositivos vinculados → Vincular dispositivo**.

**Flujo conversacional:**
1. Envía al número vinculado: `Hola, vengo a dejar una PQR`
2. El bot solicita nombre, cédula y correo
3. El usuario describe su caso en texto o audio
4. La IA clasifica y devuelve el código de radicado
5. El usuario puede hacer preguntas de seguimiento

**Comandos disponibles en WhatsApp:**

| Mensaje | Acción |
|---------|--------|
| `CONSULTAR PQR-2026-0000` | Ver estado de un caso |
| `nuevo caso` | Radicar otra PQR |
| `reiniciar` | Reiniciar el flujo |

---

## Módulo Telegram

Con `TELEGRAM_ENABLED=true` y el token configurado, el bot arranca automáticamente sin necesidad de escanear QR.

El flujo es idéntico al de WhatsApp. Busca tu bot en Telegram por el username que le asignaste y escríbele directamente.

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
| GET | `/api/pqr/user/historial` | Usuario | Historial del usuario autenticado |
| GET | `/api/pqr/admin/listar` | Admin | Listar todas las PQR con filtros y paginación |
| GET | `/api/pqr/admin/stats` | Admin | Estadísticas del sistema |
| PUT | `/api/pqr/:codigo/estado` | Admin | Cambiar estado de una PQR |
| PUT | `/api/pqr/:codigo/respuesta` | Admin | Escribir respuesta institucional |
| PUT | `/api/pqr/:codigo/aprobar` | Admin | Aprobar respuesta generada por IA |
| POST | `/api/auth/login` | Público | Iniciar sesión |
| POST | `/api/auth/register` | Público | Registrar nuevo usuario |

---

## Credenciales por defecto

| Campo | Valor |
|-------|-------|
| Email admin | admin@pqr.edu.co |
| Contraseña | admin123 |

> Configura `ADMIN_EMAIL` y `ADMIN_PASSWORD` en el `.env` **antes del primer arranque** para usar tus propias credenciales. Una vez creado el admin no se vuelve a recrear.

---

## Notas importantes

- El backend debe estar corriendo **antes** de iniciar el frontend
- Los archivos `.env` y `database.db` **no deben subirse al repositorio** (están en `.gitignore`)
- La carpeta `wa-auth/` tampoco debe subirse — contiene la sesión de WhatsApp
- Para detener los servidores usa `Ctrl+C` en cada terminal
- El costo de OpenRouter es menor a `$0.001 USD` por clasificación con modelos gratuitos

---

## Comandos de referencia rápida

```bash
# Backend
cd backend && node index.js

# Frontend (nueva terminal)
cd frontend && npm run dev
```
