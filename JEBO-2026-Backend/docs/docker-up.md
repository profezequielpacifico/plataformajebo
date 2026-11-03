# Levantar JEBO 2026 completo con Docker

Stack: **Postgres 18** + **API (Node/Express)** + **Frontend (Vite build + nginx)**.

## Requisitos

- Docker + Docker Compose v2
- Ambos repos **hermanos** (misma carpeta padre):

```
Jebo2026/   (o JEBO 2026/)
  JEBO-2026-Backend/     ← acá se corre compose
  JEBO-2026-Frontend/
  jebo_2026_backup_....sql   ← opcional, solo primer arranque con data
```

## Puertos (host)

### Producción (base compose)

| Servicio | Puerto |
|----------|--------|
| Frontend | **15173** |

### Desarrollo (base + `docker-compose.dev.yml`)

| Servicio   | Puerto |
|------------|--------|
| Frontend   | **15173** |
| API        | **15252** |
| PostgreSQL | **15432** |
| pgAdmin    | **5051**  |

## 1. Configurar entorno

Desde el Backend:

```bash
cd JEBO-2026-Backend
cp .env.docker.example .env.docker
```

Editá `.env.docker`:

```env
DB_NAME=jebo_2026
DB_USER=jebo
DB_PASSWORD=jebo_secret_change_me

JWT_SECRET=GENERALO_CON_npm_run_secret__NO_ESTE_VALOR_SIRVE
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Local:
CORS_ORIGIN=http://localhost:15173

# Servidor remoto (ejemplo DonWeb):
# CORS_ORIGIN=http://149.50.159.21:15173

BCRYPT_ROUNDS=12
```

## 2. (Opcional) Cargar dump de base de datos

Solo se aplica en el **primer** `docker compose up` (volumen vacío).

```bash
# Desde JEBO-2026-Backend: copiar el dump tal cual
cp "../jebo_2026_backup_20260624_102025.sql" docker/db/init/01_backup.sql
```

Eso genera `docker/db/init/01_backup.sql` (gitignored).

Sin dump: las migraciones Knex crean el schema vacío (baseline + deltas).

## 3. Levantar

### Producción (solo web expuesto)

```bash
cd JEBO-2026-Backend
docker compose --env-file .env.docker up --build -d
```

### Desarrollo (web + API + pgAdmin expuestos)

```bash
cd JEBO-2026-Backend
docker compose --env-file .env.docker \
  -f docker-compose.yml -f docker-compose.dev.yml \
  up --build -d
```

Verificar:

```bash
docker compose --env-file .env.docker ps
docker logs jebo-api --tail 40
```

La API debe loguear migraciones y: `Servidor JEBO 2026 corriendo en puerto 3000`.

## 4. URLs

| Qué        | Producción                        | Desarrollo                         |
|------------|-----------------------------------|------------------------------------|
| App        | http://localhost:15173            | http://localhost:15173             |
| API health | http://localhost:15173/api/health | http://localhost:15252/health      |
| API nginx  | http://localhost:15173/api/health | http://localhost:15173/api/health  |
| Postgres   | no expuesto                       | localhost:15432                    |
| pgAdmin    | no expuesto                       | http://localhost:5051              |

Si cargaste el dump o corriste el seed, las cuentas de desarrollo se crean con contraseña aleatoria: el seed las imprime por stdout al final, una sola vez. Para fijar una contraseña conocida en un entorno de desarrollo, pasala por variable de entorno antes de correrlo:

```bash
export SEED_ADMIN_PASSWORD=una_clave_local
npm run seed
```

En producción `npm run seed` se niega a correr sin esas variables.

## 5. Parar / reiniciar / reset DB

```bash
# Parar
docker compose --env-file .env.docker down

# Reiniciar sin borrar data
docker compose --env-file .env.docker up -d

# Borrar volúmenes (DB desde cero; vuelve a correr init + migraciones)
docker compose --env-file .env.docker down -v
docker compose --env-file .env.docker up --build -d
```

## Notas

- Compose se ejecuta **siempre** desde `JEBO-2026-Backend` porque el build del front usa `../JEBO-2026-Frontend`.
- El dump SQL **no** va al repo: se sube a mano al server.
- Documentación relacionada: [frontend-dev](./frontend-dev.md), [backend-dev](./backend-dev.md).
