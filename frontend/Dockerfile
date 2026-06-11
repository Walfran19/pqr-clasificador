# ─── Etapa 1: build ───────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# URL base de la API. Por defecto "/api" para que Nginx la enrute al backend
# (ver nginx.conf). En AWS se puede sobreescribir apuntando al dominio del API.
ARG VITE_API_URL=/api
ARG VITE_ELEVEN_KEY=
ARG VITE_ELEVEN_VOICE=
ENV VITE_API_URL=$VITE_API_URL \
    VITE_ELEVEN_KEY=$VITE_ELEVEN_KEY \
    VITE_ELEVEN_VOICE=$VITE_ELEVEN_VOICE

RUN npm run build

# ─── Etapa 2: servidor estático ──────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY public/runtime-config.template.js /usr/share/nginx/html/runtime-config.template.js
COPY docker-entrypoint.d/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

ENV API_BASE_URL=""

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
