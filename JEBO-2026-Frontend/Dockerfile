# Etapa de build.
#
# node:24 y no node:18: Node 18 quedó fuera de soporte en abril de 2025 y
# arrastra Alpine, musl, busybox y las librerías de OpenSSL de esa generación.
# En la imagen del API eso eran 69 de los 73 CVE de `trivy`, casi todos de la
# base y no del código. Actualizar la base borra esa lista de una vez.
FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
# npm install (not ci): lockfile from Windows may omit Linux optional deps (lightningcss, etc.)
RUN npm install

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
# El `include` de nginx.conf: sin copiar este archivo, nginx no arranca con
# "open() /etc/nginx/security_headers.conf failed". Los headers de seguridad son
# un include aparte justamente para poder reusarlos en los `location` que
# declaran su propio `add_header` (que no heredan los del `server`).
COPY security_headers.conf /etc/nginx/security_headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
