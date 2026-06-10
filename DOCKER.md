# Guía de despliegue con Docker

Esta guía explica cómo levantar todo el sistema (frontend, backend y base de datos) usando Docker, en cualquier equipo.

## Archivos relevantes

```
pqr-clasificador/
├── docker-compose.yml        # Orquesta los 3 servicios
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── .env                  # NO está en git, hay que crearlo (ver paso 3)
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── .dockerignore
```

- **backend**: Node 22 + Express + better-sqlite3, expone el puerto `3001`.
- **frontend**: build de Vite servido por Nginx en el puerto `80`. Nginx hace de proxy de `/api/*` hacia el backend, así el frontend no necesita conocer la URL del backend.
- **base de datos**: SQLite, persistida en un volumen Docker (`db-data`), no requiere contenedor propio.

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

La primera vez tarda varios minutos (compila `better-sqlite3` y hace el build de Vite).

## 5. Levantar los servicios

```powershell
docker compose up -d
```

Esto crea:
- `pqr-backend` → `http://localhost:3001`
- `pqr-frontend` → `http://localhost` (puerto 80)
- Volúmenes `db-data` (SQLite) y `wa-auth-data` (sesión de WhatsApp)

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

Si ya tienes una `backend/database.db` o una sesión `backend/wa-auth/` con datos que quieras conservar, cópialos dentro del volumen antes o después del primer arranque:

```powershell
# Con los contenedores corriendo:
docker cp backend\database.db pqr-backend:/app/data/database.db
docker cp backend\wa-auth\.   pqr-backend:/app/wa-auth
docker compose restart backend
```

---

## Próximos pasos (AWS / Terraform)

Cuando quieras pasar esto a AWS, ten en cuenta dos puntos importantes que afectan la arquitectura:

1. **SQLite no es ideal para Lambda**: el filesystem de Lambda es efímero y no soporta escrituras concurrentes seguras. Para un despliegue serverless real conviene migrar a **RDS (PostgreSQL)** o **Aurora Serverless**.
2. **Los bots de WhatsApp (Baileys) y Telegram mantienen una conexión persistente** (socket/polling), lo cual **no es compatible con Lambda** (ejecución bajo demanda y con timeout). Para esa parte conviene un contenedor "siempre encendido" en **ECS Fargate** (las imágenes Docker que ya creamos sirven directo para esto).

Una arquitectura mixta razonable sería: Lambda + API Gateway para los endpoints REST sin estado, ECS Fargate para los bots (WhatsApp/Telegram), RDS para la base de datos, y S3 + CloudFront para el frontend. Lo vemos en detalle cuando llegues a esa fase.
