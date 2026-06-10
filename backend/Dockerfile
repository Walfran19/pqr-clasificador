# ─── Etapa 1: dependencias ────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# ─── Etapa 2: imagen final ───────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3001

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Volumen para datos persistentes: sesión de WhatsApp (Baileys)
RUN mkdir -p /app/wa-auth

EXPOSE 3001

CMD ["node", "index.js"]
