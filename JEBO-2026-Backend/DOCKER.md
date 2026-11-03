# JEBO 2026 — Docker

Stack: Postgres 18 + API (Node 18) + Frontend (Vite build + nginx).

Guías detalladas en [`docs/`](./docs/): [docker-up](./docs/docker-up.md) · [frontend-dev](./docs/frontend-dev.md) · [backend-dev](./docs/backend-dev.md).

## Layout

```
JEBO 2026/
  JEBO-2026-Backend/     ← run compose from here
  JEBO-2026-Frontend/    ← sibling (build context)
```

## Production (default compose)

```bash
cd JEBO-2026-Backend
cp .env.docker.example .env.docker
# Edit .env.docker and set a strong JWT_SECRET (npm run secret)
docker compose --env-file .env.docker up --build -d
```

Only the web container is published on host port **15173**; the API stays internal behind nginx.

## Development (with API + pgAdmin exposed)

```bash
docker compose --env-file .env.docker \
  -f docker-compose.yml -f docker-compose.dev.yml \
  up --build -d
```

| Service     | Default host port | Container port |
|-------------|-------------------|----------------|
| Web (nginx) | 15173             | 80             |
| API         | 15252             | 3000           |
| Postgres    | 15432             | 5432           |
| pgAdmin     | 5051              | 80             |

> `WEB_PORT` can be customized in `.env.docker` (default 15173). If you change it, update `CORS_ORIGIN` accordingly.

## First run (with backup data)

1. Copy env: `cp .env.docker.example .env.docker` (edit secrets).
2. Optional: copy your SQL dump to `docker/db/init/01_backup.sql` (gitignored).
   Without it, Knex migrations create the empty schema.

3. Start:

```bash
docker compose --env-file .env.docker up --build
```

4. Open http://localhost:15173 — API health via nginx at http://localhost:15173/api/health.

On Windows, prefer `--env-file .env.docker` so your local Node `.env` does not conflict.

## pgAdmin

Accessible at http://localhost:5051 (only with `docker-compose.dev.yml`). Login with `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD` from `.env.docker` (defaults `admin@example.com` / `admin`).

To connect to the database, register a server with:
- Host: `db`
- Port: `5432`
- Maintenance DB / Database: `jebo_2026`
- Username: `jebo`
- Password: `jebo_secret_change_me` (or `DB_PASSWORD`)

## Without dump

Omit `docker/db/init/*.sql`. Migrations create the full schema (baseline + zona deltas). Seed separately if needed (`npm run db:seed` against the DB).

## Re-init DB from scratch

```bash
docker compose --env-file .env.docker down -v
docker compose --env-file .env.docker up --build
```

## New schema changes

Add a file under `migrations/` (Knex), then rebuild/restart `api` (entrypoint runs `migrate:latest`).
