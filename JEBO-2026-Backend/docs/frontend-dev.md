# Desarrollar el frontend apuntando a la API en Docker

Objetivo: correr el SPA con **Vite en modo dev** mientras la API (y opcionalmente la DB) viven en Docker.

## Prerrequisito

API levantada en Docker (desde el Backend):

```bash
cd JEBO-2026-Backend
docker compose --env-file .env.docker \
  -f docker-compose.yml -f docker-compose.dev.yml \
  up -d db api
```

La API queda en **http://localhost:15252**.

## Cómo habla el frontend con la API

En desarrollo, el cliente usa rutas relativas `/api/...`.

Vite las proxea a la API Docker (ver `vite.config.js`):

```js
proxy: {
  '/api': {
    target: process.env.VITE_PROXY_TARGET || 'http://localhost:15252',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  }
}
```

El rewrite quita el prefijo `/api` porque Express monta `/auth`, `/users`, etc. **sin** ese prefijo.

## Pasos

1. Asegurate de que la API responde:

```bash
curl http://localhost:15252/health
```

2. En el Frontend:

```bash
cd JEBO-2026-Frontend
npm install
npm run dev
```

Por defecto Vite escucha en **http://localhost:4000** (`vite.config.js`).

3. Abrí el browser en esa URL e iniciá sesión (usuarios del dump/API Docker).

## Si la API no está en 15252

```bash
# Windows PowerShell
$env:VITE_PROXY_TARGET="http://localhost:OTRO_PUERTO"
npm run dev

# bash
VITE_PROXY_TARGET=http://localhost:OTRO_PUERTO npm run dev
```

## CORS

Con proxy de Vite, el browser habla **mismo origen** (`localhost:4000` → `/api`), así que **no** hace falta tocar `CORS_ORIGIN` para este flujo.

`CORS_ORIGIN` importa cuando el front llama a la API por URL absoluta (otro host/puerto sin proxy).

## Qué no hacer

- No hardcodear IPs de producción en `src/config/env.js` para laburar local.
- No hace falta rebuild del contenedor `web` mientras desarrollás: usá `npm run dev`.
- El contenedor `web` (puerto 15173) es para **probar el build de producción**, no para HMR.

## Probar el front "como en prod" (opcional)

```bash
cd JEBO-2026-Backend
docker compose --env-file .env.docker up --build -d web
```

Abrí http://localhost:15173 — nginx sirve el build y proxea `/api` → `api:3000`.

## Checklist rápido

| Check | Comando / URL |
|-------|----------------|
| API up | `http://localhost:15252/health` |
| Vite | `npm run dev` → `:4000` |
| Login | usa usuarios de la DB Docker |
| Proxy | DevTools → Network: requests a `/api/...` con 200 |
