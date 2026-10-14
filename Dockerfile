# syntax=docker/dockerfile:1
# Imagen común para los servicios Node. Uso: docker build --build-arg SERVICIO=api-citas .
FROM node:24-alpine

ARG SERVICIO
ENV NODE_ENV=production \
    SERVICIO=${SERVICIO}
WORKDIR /app

# Primero solo manifiestos: la capa de dependencias se reutiliza si no cambian.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY services/api-citas/package.json services/api-citas/
COPY services/notificaciones/package.json services/notificaciones/
COPY services/recordatorios/package.json services/recordatorios/
RUN npm ci --omit=dev --workspace=services/${SERVICIO} && npm cache clean --force

COPY packages/shared/src packages/shared/src
COPY services/${SERVICIO}/src services/${SERVICIO}/src

# Volumen de datos (lo usa Notificaciones) y ejecución sin root.
RUN mkdir -p /data && chown node:node /data
USER node

CMD ["sh", "-c", "exec node services/${SERVICIO}/src/index.js"]
