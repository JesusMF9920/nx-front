# Frontend Next.js 16 (output: standalone) — build con Node fijo para Coolify.
# node:22-bookworm-slim trae Node 22.x reciente (>=22.13), compatible con pnpm 11.
# ---- build ----
FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# pnpm alineado con el campo packageManager del package.json (pnpm@11.12.0).
RUN npm install -g pnpm@11.12.0

# Dependencias con lockfile congelado. pnpm-workspace.yaml es imprescindible:
# aporta allowBuilds/minimumReleaseAge que deben cuadrar con el lockfile
# (si falta -> ERR_PNPM_LOCKFILE_CONFIG_MISMATCH).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# NEXT_PUBLIC_* se hornea en el bundle del cliente en build-time; Coolify debe
# pasar NEXT_PUBLIC_API_URL como build arg (marcarla como "Build Variable").
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY . .
RUN pnpm run build

# ---- runtime ----
# Imagen mínima: solo el bundle autocontenido (output: standalone).
FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
# Next standalone lee HOSTNAME/PORT del entorno. 0.0.0.0 para que Traefik lo alcance.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# server.js + node_modules mínimos + estáticos + public.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3000

# Healthcheck: GET / en el server de Next (standalone). Se usa `node` (presente)
# en vez de curl/wget, ausentes en la imagen slim. Cualquier respuesta <500 se
# considera sana (200/redirects); solo 5xx o conexión caída marcan unhealthy.
HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
