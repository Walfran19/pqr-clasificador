# ─── Etapa 1: dependencias (incluye toolchain para compilar better-sqlite3) ──
FROM node:22-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

# ─── Etapa 2: imagen final ───────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3001 \
    DB_PATH=/app/data/database.db

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Volúmenes para datos persistentes: base de datos y sesión de WhatsApp (Baileys)
RUN mkdir -p /app/data /app/wa-auth

EXPOSE 3001

CMD ["node", "index.js"]
