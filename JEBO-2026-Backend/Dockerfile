# node:24 y no node:18: Node 18 quedó fuera de soporte en abril de 2025.
#
# El impacto no es teórico. `trivy` sobre la imagen anterior reportaba 73 CVE, de
# los cuales 69 eran de la imagen base y no del código: node:18-alpine arrastra
# Alpine, musl, busybox y las librerías de OpenSSL de esa generación. Los
# críticos eran `libcrypto3`/`libssl3` 3.3.3-r0 (3.3.7-r0 ya disponible) y `tar`
# 6.2.1 (7.5.19).
#
# Actualizar la base los resuelve de una vez, en vez de parchear 69 CVE uno por
# uno — y evita que el próximo `npm install` reintroduzca la misma superficie.
FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY knexfile.js ./
COPY migrations ./migrations
COPY scripts ./scripts
COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000

# X-11: el proceso deja de correr como root.
#
# El intento anterior —poner `USER node` y nada más— dejó el contenedor
# permanentemente unhealthy, y el motivo está en las dos líneas siguientes: el
# logger de winston escribe en `/app/logs` y multer escribe en `/app/uploads`, y
# ambos directorios quedaban de root. El proceso sin privilegios moría con
# EACCES al arrancar, y como el entrypoint no distingue "no puedo escribir el
# log" de "fallé", el healthcheck de `docker compose` nunca se satisfacía.
#
# La corrección no es dejar `USER node`, es darle al usuario lo que necesita
# antes de bajarle los privilegios. Se crean los directorios en el build y se
# los cambia de dueño acá:
#
#   - `/app/logs` no se monta como volumen: es del contenedor.
#   - `/app/uploads` SÍ es un volumen con nombre (`jebo_uploads`). Docker
#     inicializa un volumen nuevo copiando contenido y propietario desde el
#     path de la imagen, así que este chown es lo que hace que el volumen
#     nazca con dueño `node` en vez de con dueño `root`.
#     Un volumen ya existente NO se corrige con esto: si `jebo_uploads` se creó
#     antes de este cambio, hay que borrarlo o cambiarle el dueño a mano, o el
#     upload de reglamentos va a fallar con EACCES igual.
#
# `read_only: true`, `cap_drop` y `no-new-privileges` están en docker-compose.yml;
# funcionan solo si el usuario no es root, así que van juntos con esto.
RUN mkdir -p /app/logs /app/uploads \
    && chown -R node:node /app/logs /app/uploads \
    && chmod 750 /app/logs /app/uploads

USER node

CMD ["node", "scripts/docker-entrypoint.js"]
