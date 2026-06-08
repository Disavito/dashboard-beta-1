# ── Etapa 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copia solo los manifiestos primero para aprovechar la cache de Docker
COPY package.json package-lock.json ./

# Instala dependencias (incluyendo devDependencies necesarias para el build)
RUN npm ci

# Copia el resto del código fuente
COPY . .

# Las variables VITE_ se incrustan en tiempo de build.
# Se pasan como build-args desde EasyPanel o docker build.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_CONSULTAS_PERU_API_TOKEN
ARG VITE_MIAPI_CLOUD_API_TOKEN
ARG VITE_INVOICING_API_BASE_URL
ARG VITE_INVOICING_API_AUTH_TOKEN
ARG VITE_CONSULTADATOS_TOKEN

# Genera el build de producción
RUN npm run build

# ── Etapa 2: Servir con Node.js Proxy ──────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Solo copiamos package.json para dependencias de prod
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copiamos el servidor express y los archivos estáticos
COPY server.js ./
COPY --from=builder /app/dist ./dist

# Fijamos el puerto a 3000 por defecto para Easypanel
ENV PORT=3000
EXPOSE 3000

# Inicia el servidor Node
CMD ["npm", "start"]
