# Sistema Inteligente de Gestión de PQR con IA

Plataforma web para la clasificación automática de Peticiones, Quejas y Reclamos (PQR) en instituciones educativas, utilizando Inteligencia Artificial para analizar el contenido y clasificar cada caso por tipo, categoría, prioridad, sentimiento y área responsable.

---

## Tecnologías utilizadas

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite + React Router |
| Backend | Node.js + Express |
| Base de datos | SQLite (better-sqlite3) |
| Inteligencia Artificial | OpenRouter API (LLM) |
| Autenticación | JWT + bcrypt |

---

## Requisitos previos

Antes de ejecutar el proyecto asegúrate de tener instalado:

- [Node.js](https://nodejs.org/) v18 o superior
- npm v9 o superior
- Una cuenta en [OpenRouter](https://openrouter.ai) para obtener la API key gratuita

---

## Estructura del proyecto

```
pqr-clasificador/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   └── pqr.controller.js
│   │   ├── models/
│   │   │   └── database.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   └── pqr.routes.js
│   │   └── services/
│   │       ├── classifier.service.js
│   │       └── codigo.service.js
│   ├── .env
│   ├── index.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── AdminPanel.jsx
    │   │   ├── ConsultarPQR.jsx
    │   │   ├── Login.jsx
    │   │   └── RadicarPQR.jsx
    │   ├── services/
    │   │   └── pqr.service.js
    │   ├── App.jsx
    │   └── main.jsx
    └── package.json
```

---

## Configuración y ejecución

### 1. Clonar o descargar el proyecto

```bash
git clone https://github.com/Walfran19/pqr-clasificador.git
cd pqr-clasificador
```

### 2. Configurar el Backend

Entra a la carpeta del backend e instala las dependencias:

```bash
cd backend
npm install
```

Crea el archivo `.env` dentro de la carpeta `backend/` con el siguiente contenido:

```
OPENROUTER_API_KEY=tu_api_key_de_openrouter
JWT_SECRET=pqr_clave_secreta_2026
PORT=3001
```

> **¿Cómo obtener la API key de OpenRouter?**
> 1. Ve a [openrouter.ai](https://openrouter.ai) y crea una cuenta
> 2. Ve a **Keys** → **Create Key**
> 3. Copia la key y pégala en el `.env`
> 4. Los modelos con `:free` no tienen costo

Inicia el servidor backend:

```bash
node index.js
```

Si todo está correcto verás:

```
Admin creado — email: admin@pqr.edu.co / password: admin123
Servidor corriendo en http://localhost:3001
```

> La base de datos `database.db` se crea automáticamente la primera vez que arrancas el servidor.

### 3. Configurar el Frontend

Abre una **nueva terminal**, entra a la carpeta del frontend e instala las dependencias:

```bash
cd frontend
npm install
```

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Verás algo como:

```
VITE v8.x.x  ready in 300ms
➜  Local:   http://localhost:5173/
```

### 4. Abrir la aplicación

Con ambos servidores corriendo, abre el navegador en:

```
http://localhost:5173
```

---

## Credenciales del panel de administración

| Campo | Valor |
|-------|-------|
| Email | admin@pqr.edu.co |
| Contraseña | admin123 |

> Puedes cambiar estas credenciales directamente en `backend/src/models/database.js`

---

## Funcionalidades

### Página principal — Radicar PQR (`/`)
- Formulario público para radicar una PQR sin necesidad de cuenta
- La IA clasifica automáticamente por: tipo, categoría, prioridad, sentimiento y área responsable
- Se genera un código de radicado único (ej: `PQR-2026-4821`)
- Ejemplos de prueba rápida incluidos

### Consultar estado (`/consultar`)
- Cualquier usuario puede consultar el estado de su PQR ingresando el código de radicado
- Muestra todos los detalles de la clasificación y el estado actual

### Panel de administración (`/admin`)
- Acceso protegido con login
- Visualiza todas las PQR ordenadas por prioridad
- Filtros por estado, categoría y prioridad
- Estadísticas en tiempo real
- Cambio de estado por PQR (Recibida → En proceso → Cerrada)
- Vista de detalle completo por cada caso

---

## Notas importantes

- El backend debe estar corriendo en el **puerto 3001** antes de iniciar el frontend
- El archivo `.env` **no debe subirse al repositorio** (ya está en `.gitignore`)
- Para detener los servidores usa `Ctrl+C` en cada terminal
- Los costos de la API de OpenRouter son mínimos (menos de $0.001 USD por clasificación)

---

## Comandos rápidos de referencia

```bash
# Iniciar backend
cd backend && node index.js

# Iniciar frontend (en otra terminal)
cd frontend && npm run dev
```
