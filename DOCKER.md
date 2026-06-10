# Guía de despliegue con Docker

Esta guía explica cómo levantar todo el sistema (frontend, backend y base de datos) usando Docker, en cualquier equipo.

## Archivos relevantes

```
pqr-clasificador/
├── docker-compose.yml        # Orquesta los 4 servicios
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── .env                  # NO está en git, hay que crearlo (ver paso 3)
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── .dockerignore
```

- **backend**: Node 22 + Express + PostgreSQL (vía `pg`), expone el puerto `3001`.
- **frontend**: build de Vite servido por Nginx en el puerto `80`. Nginx hace de proxy de `/api/*` hacia el backend, así el frontend no necesita conocer la URL del backend.
- **postgres**: PostgreSQL 16, persistido en un volumen Docker (`pg-data`). El backend se conecta usando la variable `DATABASE_URL` (ya configurada en `docker-compose.yml` para apuntar a este servicio).

---

## 1. Requisitos previos en el PC nuevo

- Instalar [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose).
- Verificar instalación:

```powershell
docker --version
docker compose version
```

## 2. Llevar el proyecto al otro PC

Si el repo está en GitHub (caso de este proyecto):

```powershell
git clone https://github.com/Walfran19/pqr-clasificador.git
cd pqr-clasificador
```

> Si tienes cambios sin subir, haz `git push` antes desde este PC, o copia la carpeta completa (sin `node_modules`).

## 3. Crear el archivo `backend/.env`

Este archivo **no se sube a git** (está en `.gitignore`), así que hay que crearlo manualmente. Copia `backend/.env.example` a `backend/.env` y completa los valores reales:

```powershell
cd backend
copy .env.example .env
```

Edita `backend/.env` y completa al menos:

| Variable | Descripción |
|---|---|
| `JWT_SECRET` | Cadena larga y aleatoria para firmar tokens |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credenciales del admin inicial |
| `OPENROUTER_API_KEY` | API key de OpenRouter (clasificación IA) |
| `EMAIL_*` | SMTP para notificaciones (opcional) |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram (si aplica) |
| `FRONTEND_URL` / `APP_URL` | URL pública del frontend (para emails) |

> Si por ahora no usarás WhatsApp o Telegram, agrega `WHATSAPP_ENABLED=false` y/o `TELEGRAM_ENABLED=false` para que el backend no intente conectarse.

No es necesario crear `frontend/.env` para Docker: las variables `VITE_*` se pasan como build-args en `docker-compose.yml` (por defecto `VITE_API_URL=/api`, ya configurado para el proxy de Nginx).

## 4. Construir las imágenes

Desde la raíz del proyecto (donde está `docker-compose.yml`):

```powershell
docker compose build
```

La primera vez tarda varios minutos (descarga la imagen de Postgres y hace el build de Vite).

## 5. Levantar los servicios

```powershell
docker compose up -d
```

Esto crea:
- `pqr-postgres` → base de datos PostgreSQL (puerto 5432, solo interno)
- `pqr-backend` → `http://localhost:3001`
- `pqr-frontend` → `http://localhost` (puerto 80)
- Volúmenes `pg-data` (PostgreSQL) y `wa-auth-data` (sesión de WhatsApp)

> La primera vez que arranca, el backend crea las tablas automáticamente y muestra en los logs (`docker compose logs -f backend`) el email/contraseña del administrador inicial (o usa los que definiste en `ADMIN_EMAIL`/`ADMIN_PASSWORD`).

## 6. Vincular WhatsApp (si `WHATSAPP_ENABLED` no es `false`)

Baileys imprime un código QR en los logs la primera vez:

```powershell
docker compose logs -f backend
```

Escanéalo desde WhatsApp → Dispositivos vinculados. La sesión queda guardada en el volumen `wa-auth-data`, así que no tendrás que repetirlo en cada `docker compose up`.

## 7. Verificar

- Frontend: abre `http://localhost` en el navegador.
- API: `http://localhost:3001/` debería responder `{"mensaje":"API PQR activa ✓"}`.
- Revisa que el frontend pueda llamar a `/api/...` sin errores de CORS (pasa por el proxy de Nginx).

---

## Comandos útiles

```powershell
# Ver logs en tiempo real
docker compose logs -f

# Reconstruir tras cambios en el código
docker compose up -d --build

# Detener los contenedores (conserva los datos)
docker compose down

# Detener y BORRAR los volúmenes (pierdes la BD y la sesión de WhatsApp)
docker compose down -v
```

## Migrar datos existentes (opcional)

Si ya tienes una sesión `backend/wa-auth/` con datos que quieras conservar, cópiala dentro del volumen antes o después del primer arranque:

```powershell
# Con los contenedores corriendo:
docker cp backend\wa-auth\.   pqr-backend:/app/wa-auth
docker compose restart backend
```

Si vienes de una versión anterior con SQLite (`backend/database.db`) y quieres conservar los datos, exporta las tablas a SQL e impórtalas en Postgres, por ejemplo con [`pgloader`](https://pgloader.io/) o un script manual de migración.

---

## Próximos pasos (AWS / Terraform)

El sistema ya está preparado para AWS:

1. **Base de datos**: el backend usa **PostgreSQL** (vía `pg`), compatible directamente con **RDS PostgreSQL**. Solo hay que apuntar `DATABASE_URL` al endpoint de RDS.
2. **Backend (API + bots de WhatsApp/Telegram)**: al mantener conexiones persistentes (socket/polling), conviene un contenedor "siempre encendido" en **ECS Fargate** — las imágenes Docker que ya creamos sirven directo para esto.

Arquitectura objetivo: ECS Fargate (un solo servicio con la API y los bots), RDS PostgreSQL para la base de datos, y S3 + CloudFront para el frontend, todo provisionado con Terraform.
