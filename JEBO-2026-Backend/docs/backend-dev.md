# Desarrollar el backend y probarlo con Docker

Foco: schema con **Knex migrations**, nuevas entidades / cambios, y cómo validarlos contra Postgres en Docker.

## Arquitectura de datos

| Pieza | Rol |
|-------|-----|
| `knexfile.js` | Conexión y carpeta `migrations/` |
| `migrations/20260624102025_001_baseline.js` | Schema inicial (SQL del dump, sin data) |
| `migrations/20260624102025_002_zona_and_deltas.js` | Primeras evoluciones (`zona`, etc.) |
| `migrations/sql/001_baseline.sql` | DDL usado por la baseline |
| `scripts/docker-migrate.js` | Stamp baseline si la DB vino de dump + `migrate:latest` |
| `scripts/docker-entrypoint.js` | Espera DB → migrate → `node src/app.js` |

**Fuente de verdad del schema = migraciones.** No uses scripts sueltos tipo `migrate-equipos.js` (está deprecado).

Modelos en `src/models/` son metadata (columnas/relaciones); deben **alinearse** con lo que dejan las migraciones.

## Arranque típico de desarrollo

### Opción A — Solo DB en Docker, API en el host (rápido para iterar)

```bash
cd JEBO-2026-Backend
docker compose --env-file .env.docker up -d db

# .env local apuntando al Postgres publicado
# DB_HOST=localhost
# DB_PORT=15432
# DB_NAME=jebo_2026
# DB_USER=jebo
# DB_PASSWORD=jebo_secret_change_me

npm install
npm run migrate
npm run dev
```

API en http://localhost:3000 (o el `PORT` de tu `.env`).

### Opción B — API también en Docker (cerca de prod)

```bash
docker compose --env-file .env.docker up --build -d db api
docker logs -f jebo-api
```

API en http://localhost:15252. Cada cambio de código requiere rebuild/restart del servicio `api`:

```bash
docker compose --env-file .env.docker up --build -d api
```

### Comandos Knex útiles

```bash
npm run migrate           # apply pending
npm run migrate:status    # list applied / pending
npm run migrate:rollback  # rollback last batch
```

---

## Crear una entidad nueva (end-to-end)

Ejemplo: entidad `categoria`.

### 1. Nueva migración

```bash
npx knex migrate:make add_categoria
```

Se crea algo como `migrations/20260731120000_add_categoria.js`.

Implementá `up` / `down`:

```js
exports.up = async function up(knex) {
  const exists = await knex.schema.hasTable('categoria');
  if (!exists) {
    await knex.schema.createTable('categoria', (table) => {
      table.increments('id_categoria').primary();
      table.string('nombre', 150).notNullable();
      table.text('descripcion');
      table.timestamps(true, true); // o creado_en / actualizado_en al estilo del proyecto
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('categoria');
};
```

Convención del proyecto: preferí `hasTable` / `hasColumn` para migraciones **idempotentes** cuando sea razonable (sobre todo en alters).

### 2. Aplicar

```bash
# API en host
npm run migrate

# o solo DB Docker + migrate en host (recomendado)
# o rebuild api en Docker (el entrypoint corre migrate al arrancar)
docker compose --env-file .env.docker up --build -d api
```

### 3. Capas de la API (mismo patrón existente)

1. `src/models/categoria.model.js` — `table`, `pk`, `columns`, `relationships`
2. `src/repositories/categoria.repository.js` — queries Knex
3. `src/services/categoria.service.js` — reglas de negocio
4. `src/controllers/categoria.controller.js`
5. `src/routes/categoria.routes.js` + montar en `src/routes/index.js`
6. Validadores / roles si aplica

### 4. Probar

```bash
curl http://localhost:15252/health
# o :3000 si corrés API local
curl -H "Authorization: Bearer <token>" http://localhost:15252/categories
```

---

## Editar una entidad existente

Ejemplo: agregar `activo` a `disciplina`.

### 1. Migración de alter

```bash
npx knex migrate:make disciplina_add_activo
```

```js
exports.up = async function up(knex) {
  const has = await knex.schema.hasColumn('disciplina', 'activo');
  if (!has) {
    await knex.schema.alterTable('disciplina', (table) => {
      table.boolean('activo').notNullable().defaultTo(true);
    });
  }
};

exports.down = async function down(knex) {
  const has = await knex.schema.hasColumn('disciplina', 'activo');
  if (has) {
    await knex.schema.alterTable('disciplina', (table) => {
      table.dropColumn('activo');
    });
  }
};
```

### 2. Actualizar modelo y capas

- Sumá `activo` a `columns` en `disciplina.model.js`
- Ajustá repository/service/validators/DTO de respuesta
- Actualizá tests si existen

### 3. Aplicar y verificar en Postgres Docker

```bash
npm run migrate

docker exec -it jebo-db psql -U jebo -d jebo_2026 -c "\d disciplina"
```

---

## Dump + migraciones (cómo conviven)

Al levantar con `docker/db/init/01_backup.sql`:

1. Postgres restaura schema + data del dump (sin `zona`, etc.).
2. El entrypoint **marca** `001_baseline` como aplicada (sin re-ejecutarla).
3. Corre `002` y cualquier migración **nueva** que agregues.

En DB vacía (sin dump): corre `001` + `002` + … en orden.

**Nunca** edites migraciones ya aplicadas en entornos compartidos: creá un archivo nuevo.

---

## Checklist al tocar schema

- [ ] Migración nueva con `up` y `down`
- [ ] `npm run migrate` (o restart `api` en Docker)
- [ ] Modelo `src/models/...` alineado
- [ ] Repository / service / routes
- [ ] Probado contra `localhost:15432` / API Docker
- [ ] Commit de la migración junto al código de la feature

## Referencias rápidas

- Levantar todo: [docker-up.md](./docker-up.md)
- Front contra esta API: [frontend-dev.md](./frontend-dev.md)
- Compose: `docker-compose.yml`
- Env plantilla: `.env.docker.example`
