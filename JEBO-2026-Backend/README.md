# JEBO 2026 — Backend API REST

API REST para el Sistema Administrativo de Torneos Deportivos JEBO 2026.

Este documento se regeneró a partir del código y de la base de datos real. Las
cifras de abajo se pueden verificar con los comandos indicados en cada sección.

---

## Stack tecnológico

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 18.20.8 | Runtime |
| Express | 4.18.2 | Framework HTTP |
| PostgreSQL | 16.x | Base de datos |
| Knex.js | 3.2.10 | Query builder / migraciones |
| pg | 8.11.3 | Driver PostgreSQL |
| jsonwebtoken | 9.0.2 | Autenticación (access + refresh) |
| bcryptjs | 2.4.3 | Hash de contraseñas |
| winston | 3.11.0 | Logging |
| helmet / cors / morgan / express-rate-limit | 7.1 / 2.8 / 1.10 / 6.10 | Seguridad, CORS, acceso, rate limiting |
| Jest + Supertest | 29.7 / 6.3 | Tests |
| pm2 | 7.0.1 | Process manager (dependencia declarada) |

---

## Arquitectura

```
Request → Middleware → Routes → Controller (HTTP in/out)
                                          ↓
                                    Service (reglas de negocio)
                                          ↓
                                    Repository (consultas Knex)
                                          ↓
                                    PostgreSQL 18
```

**Capas:**

- `controllers/` — solo manejan request/response HTTP. Aplican el allowlist del
  body con `soloCampos()` antes de llamar al service.
- `services/` — reglas de negocio, validaciones, errores.
- `repositories/` — consultas a BD con Knex. Validan columnas con
  `validarColumnas()` antes de armar un `insert`/`update`.
- **No hay carpeta `models/`**: los esquemas puros se movieron a `repositories/`
  (ver commit `aba8eb6`).

---

## Requisitos

- Node.js 18+
- PostgreSQL 18 o superior
- npm

---

## Instalación

```bash
git clone git@github.com:tecnican2programacion/JEBO-2026-BACKEND.git
cd JEBO-2026-Backend
npm install
```

### Variables de entorno

No hay `.env.example` en el repo. Las variables se leen en `src/config/env.js`.

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=jebo_2026
DB_USER=postgres
DB_PASSWORD=postgres

JWT_SECRET=<obligatorio, mínimo 32 bytes>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGIN=*
BCRYPT_ROUNDS=12
TRUST_PROXY=0
```

> **`JWT_SECRET` es obligatorio y la app no arranca sin él.** No tiene valor por
> defecto: `src/config/env.js` lanza un error si falta, si mide menos de 32 bytes
> o si usa un valor débil conocido (`secret`, `changeme`, `test_secret_key`, …).
> Generá uno con `openssl rand -base64 48`.
>
> Un ejemplo como `JWT_SECRET=una_clave_segura` (16 bytes) **hace fallar el
> arranque** con `JWT_SECRET debe tener al menos 32 bytes`.

`TRUST_PROXY` indica cuántos proxies hay delante de la app. El default es `0` a
propósito: con la API expuesta directamente, un `X-Forwarded-For` forjado evadiría
el lockout por IP. Subilo a `1` solo si hay nginx delante.

### Base de datos

```bash
npm run migrate            # knex migrate:latest
npm run migrate:status     # knex migrate:list
npm run db:seed            # limpiar y sembrar todo (ver abajo)
```

También hay dos scripts ejecutables en `scripts/`:

| Script | Uso |
|--------|-----|
| `scripts/migrar.sh` | **Doble click** (o `./scripts/migrar.sh`). Aplica *todas* las migraciones pendientes con `knex migrate:latest` y muestra el estado final. Se relanza en una terminal si se abre sin ella, e instala dependencias si falta `node_modules`. |
| `scripts/seed.js` | `npm run db:seed` (o `node scripts/seed.js [archivo.txt]`). Limpia toda la BD (34 tablas + secuencias), siembra los datos territoriales reales de la provincia de Buenos Aires (25 regiones, ~135 partidos; localidades desde el archivo pipe-delimited `PARTIDO \| LOCALIDAD \| CP` si se pasa o existe en `~/Desktop`), y luego roles, 7 disciplinas, instancias, horarios y el único SuperAdmin (`superadmin@jebo2026.com`, contraseña `SEED_SUPERADMIN_PASSWORD` o `SuperAdmin2026`). |

Flujo típico:

```bash
./scripts/migrar.sh        # 1. schema al día
npm run db:seed            # 2. datos iniciales
```

### Ejecutar

```bash
npm run dev                # node --watch src/app.js
npm start                  # node src/app.js
npx pm2 start src/app.js --name jebo-backend
```

---

## Scripts

| Script | Comando |
|--------|---------|
| `npm start` | `node src/app.js` |
| `npm run dev` | `node --watch src/app.js` |
| `npm test` | `jest --forceExit --detectOpenHandles` |
| `npm run test:watch` | `jest --watch --forceExit` |
| `npm run test:coverage` | `jest --coverage --forceExit` |
| `npm run lint` | `eslint src/` |
| `npm run migrate` | `knex migrate:latest` |
| `npm run migrate:rollback` | `knex migrate:rollback` |
| `npm run migrate:status` | `knex migrate:list` |
| `npm run db:seed` | `node scripts/seed.js` |

---

## Roles y guards

Los roles que existen **hoy en la base** están en la tabla `rol`:
**SuperAdmin**, **Administrador**, **Profesor**, **Arbitro**, **Juez**. No existe
un rol "Editor" ni "Visualizador".

| Guard | Concede |
|-------|---------|
| `authenticate` | Cualquier usuario con JWT válido |
| `requireSuperAdmin` | Solo SuperAdmin |
| `requireAdminOrAbove` | SuperAdmin o Administrador |
| `operarPartido` | SuperAdmin o Administrador, o **Árbitro asignado a ese partido** |
| `gestionarPresentacion` | SuperAdmin o Administrador |
| `evaluarPresentacion` | SuperAdmin o Administrador, o **Juez del jurado de esa presentación** (en escritura, además, que esté en estado evaluable) |
| `gestionarEquipoPropio` | SuperAdmin o Administrador, o **Profesor dueño del equipo** |

> **Nota sobre los nombres viejos.** `requireAdmin`, `requireEditorOrAbove`,
> `requireArbitroOrAdmin` y `requireJuezOrAdmin` se retiraron en F1.4 y ya no se
> exportan. Los dos primeros no se diferenciaban en nada: `Editor` fue borrado de
> la tabla `rol` por la migración `20260907115000_eliminar_roles_extra`, así que
> `requireEditorOrAbove` era `requireAdmin`. Y `requireAdmin` no dejaba entrar a
> SuperAdmin, que es el motivo de que el cambio no fuera cosmético: con el nombre
> viejo, el día que hubiera una cuenta SuperAdmin un endpoint olvidado la habría
> rechazado. Las tablas de endpoints de abajo marcan `Admin` y `Editor+` por
> fidelidad al guard que tenía cada ruta **antes** de F1.4; el mapa vigente está
> en [`docs/modelo-roles.md`](docs/modelo-roles.md) §6 y lo vigila
> `tests/unit/rutas-permisos.test.js`.

> **Roles en transición.** El modelo de destino, con el árbol de roles, el mapa
> de los endpoints con gate y el orden de las fases, está en
> **[`docs/modelo-roles.md`](docs/modelo-roles.md)**. Estado a F1.5:
> `SUPERADMIN` está declarado en `src/constants/roles.js`, la migración
> `20261004120000_add_rol_superadmin.js` crea la fila del rol (ya aplicada a la
> base viva) y **los 71 endpoints con gate ya usan los guards de la tabla de
> arriba**. Todavía **no hay ninguna cuenta con rol SuperAdmin**: la promoción
> de la cuenta dueña se hizo para verificar y se revirtió a `Administrador` a
> propósito, porque el frontend viejo decide el menú con
> `user.rol === 'Administrador'` y un `SuperAdmin` quedaría sin menú. La
> promoción definitiva, junto con el helper de rol del frontend y el recorte de
> `GET /users` a SuperAdmin-only, va al final de F1.6.
>
> Dos consecuencias de aplicar el mapa antes de que exista esa cuenta, y que hay
> que tener presentes al desplegar: `GET /users/:id` (pantalla de edición de
> usuarios) responde 403 para todos, y las escrituras de geografía —regiones,
> distritos y localidades—, la bitácora y los bloqueos de login son ya
> SuperAdmin-only. Por eso F1 no se despliega a mitad de camino y F1.6 va junto
> con el rebuild de `jebo-web`.

### Ciclo de vida de la cuenta (F1.5)

`PUT /users/:id` acepta `estado` (`Activo` / `Inactivo`), lo valida contra el
enum y corta las sesiones del usuario afectado: el refresh emitido antes queda
401. Lo mismo hace un cambio de `rol`. El contador `token_version` sube **en el
mismo `UPDATE`** que escribe el campo, y solo si el valor cambió —guardar el
formulario sin tocar nada no expulsa a nadie—.

Dos cosas que conviene conocer antes de tocar esta parte:

- **Un Inactivo no puede iniciar sesión, y el login no lo dice.** La respuesta es
  la misma que para una contraseña incorrecta, a propósito: distinguir "existe
  pero está dada de baja" convierte el login en un oráculo del padrón. El motivo
  real queda en la bitácora. Un cliente que matcheara `"Usuario inactivo"` deja
  de matchear.
- **El access token ya emitido sigue sirviendo hasta que expira (1 h).** Lo que
  se corta de inmediato es la renovación. Su validez la decide la firma y no la
  base, y cerrarlo antes exigiría una consulta a la base en el camino caliente de
  todos los endpoints. Es el mismo compromiso que ya regía el cambio de contraseña.

`estado` es hoy solo escribible por Administradores, y **nadie puede desactivar
su propia cuenta** (409): el login al Inactivo no tiene vuelta atrás, y en una
instalación con una sola cuenta administrativa sería el fin del sistema.

---

## API Endpoints

**109 rutas registradas** en 15 archivos de rutas. La columna `Auth` usa:

- `No` — sin autenticación
- `Sí` — `authenticate` (el recorte por institución lo hace `alcance`)
- `SuperAdmin` — `requireSuperAdmin`
- `Admin+` — `requireAdminOrAbove` (SuperAdmin o Administrador)
- `Árbitro+` — `operarPartido`: SuperAdmin o Administrador, o el Árbitro **asignado** a ese partido
- `Juez+` — `evaluarPresentacion`: SuperAdmin o Administrador, o un Juez **del jurado** de esa presentación
- `Dueño+` — `gestionarEquipoPropio`: SuperAdmin o Administrador, o el Profesor **dueño** del equipo

> Las tablas de endpoints de abajo se generaron antes de F1.4 y por eso todavía
> marcan `Admin` y `Editor+`: ahí `Admin` era `requireAdmin` (solo
> Administrador) y `Editor+` era `requireEditorOrAbove`, nombres que ya no
> existen. `Admin` y `Editor+` pasaron a `Admin+`, con tres excepciones: los 12 de
> geografía, seguridad y auditoría pasaron a `SuperAdmin`; los 22 de equipos,
> presentaciones y partidos pasaron a `Dueño+`, `Juez+` o `Árbitro+` según el
> recurso; y `GET /users/:id` ya era `SuperAdmin` desde F1.1. El reparto vigente y
> verificado está en [`docs/modelo-roles.md`](docs/modelo-roles.md) §6.

### Raíz — 12

| Método | Ruta | Auth |
|--------|------|------|
| `GET` | `/health` | No |
| `GET` | `/roles` | Sí |
| `GET` | `/statistics/dashboard` | Sí |
| `GET` | `/statistics/tournaments/:id` | Sí |
| `GET` | `/search/global` | Sí |
| `GET` | `/audit/logs` | Admin |
| `GET` | `/fixture/status/:id_torneo` | Sí |
| `POST` | `/fixture/generate` | Admin |
| `GET` | `/fixture/audit` | Admin |
| `POST` | `/inscripcion/cerrar-vencidas` | Admin |
| `GET` | `/admin/login-lockouts` | Admin |
| `DELETE` | `/admin/login-lockouts/:ip` | Admin |

### /auth — 7

| Método | Ruta | Auth |
|--------|------|------|
| `POST` | `/auth/login` | No |
| `GET` | `/auth/loginStatus` | No |
| `POST` | `/auth/refresh` | No |
| `POST` | `/auth/recover-password` | No |
| `POST` | `/auth/register` | No |
| `GET` | `/auth/me` | Sí |
| `POST` | `/auth/logout` | Sí |

### /users — 5

| Método | Ruta | Auth |
|--------|------|------|
| `GET` | `/users` | Sí — exige `?rol=` salvo SuperAdmin/Administrador (403 si falta) |
| `GET` | `/users/:id` | SuperAdmin |
| `POST` | `/users` | Admin+ |
| `PUT` | `/users/:id` | Admin+ — `estado` corta la sesión; no se puede desactivar la propia cuenta |
| `DELETE` | `/users/:id` | Admin+ |

### /tournaments — 9

| Método | Ruta | Auth |
|--------|------|------|
| `GET` | `/tournaments` | Sí |
| `GET` | `/tournaments/:id` | Sí |
| `POST` | `/tournaments` | Editor+ |
| `PUT` | `/tournaments/:id` | Editor+ |
| `DELETE` | `/tournaments/:id` | Editor+ |
| `GET` | `/tournaments/:id/standings` | Sí |
| `GET` | `/tournaments/:id/qualified` | Sí |
| `GET` | `/tournaments/:id/final` | Sí |
| `GET` | `/tournaments/:id/matches` | Sí |

### /teams — 8

| Método | Ruta | Auth |
|--------|------|------|
| `GET` | `/teams` | Sí |
| `GET` | `/teams/:id` | Sí |
| `POST` | `/teams` | Editor+ |
| `PUT` | `/teams/:id` | Editor+ |
| `DELETE` | `/teams/:id` | Editor+ |
| `POST` | `/teams/:id/enroll` | Editor+ |
| `POST` | `/teams/enroll-batch` | Editor+ |
| `GET` | `/teams/enrolled/list` | Sí |

### /matches — 9

| Método | Ruta | Auth |
|--------|------|------|
| `GET` | `/matches` | Sí |
| `GET` | `/matches/:id` | Sí |
| `GET` | `/matches/mios` | Árbitro/Admin |
| `POST` | `/matches` | Editor+ |
| `PUT` | `/matches/:id` | Editor+ |
| `DELETE` | `/matches/:id` | Editor+ |
| `PATCH` | `/matches/:id/result` | Árbitro/Admin |
| `PATCH` | `/matches/:id/status` | Árbitro/Admin |
| `GET` | `/matches/:id/live` | Árbitro/Admin |

### /stages — 8

| Método | Ruta | Auth |
|--------|------|------|
| `GET` | `/stages` | Sí |
| `GET` | `/stages/:id` | Sí |
| `POST` | `/stages` | Admin |
| `PUT` | `/stages/:id` | Admin |
| `DELETE` | `/stages/:id` | Admin |
| `GET` | `/stages/torneo/:torneoId` | Sí |
| `POST` | `/stages/torneo/:torneoId` | Admin |
| `PUT` | `/stages/torneo/:torneoId` | Admin |

### /disciplines — 7

| Método | Ruta | Auth |
|--------|------|------|
| `GET` | `/disciplines` | Sí |
| `GET` | `/disciplines/:id` | Sí |
| `POST` | `/disciplines` | Editor+ |
| `PUT` | `/disciplines/:id` | Editor+ |
| `DELETE` | `/disciplines/:id` | Editor+ |
| `GET` | `/disciplines/:id/reglamento` | Sí |
| `POST` | `/disciplines/:id/reglamento` | Editor+ |

### /courts — 9

| Método | Ruta | Auth |
|--------|------|------|
| `GET` | `/courts` | Sí |
| `GET` | `/courts/:id` | Sí |
| `GET` | `/courts/horarios` | Sí |
| `GET` | `/courts/:canchaId/disponibilidad` | Sí |
| `GET` | `/courts/:id/schedule` | Sí |
| `POST` | `/courts` | Editor+ |
| `PUT` | `/courts/:id` | Editor+ |
| `DELETE` | `/courts/:id` | Editor+ |
| `PUT` | `/courts/:id/schedule` | Editor+ |

### /scoring-formats — 5

| Método | Ruta | Auth |
|--------|------|------|
| `GET` | `/scoring-formats` | Sí |
| `GET` | `/scoring-formats/:id` | Sí |
| `POST` | `/scoring-formats` | Admin |
| `PUT` | `/scoring-formats/:id` | Admin |
| `DELETE` | `/scoring-formats/:id` | Admin |

### /regions — 5

| Método | Ruta | Auth |
|--------|------|------|
| `GET` | `/regions` | Sí |
| `GET` | `/regions/:id` | Sí |
| `POST` | `/regions` | Admin |
| `PUT` | `/regions/:id` | Admin |
| `DELETE` | `/regions/:id` | Admin |

### /districts — 5

| Método | Ruta | Auth |
|--------|------|------|
| `GET` | `/districts` | Sí |
| `GET` | `/districts/:id` | Sí |
| `POST` | `/districts` | Admin |
| `PUT` | `/districts/:id` | Admin |
| `DELETE` | `/districts/:id` | Admin |

### /localities — 5

| Método | Ruta | Auth |
|--------|------|------|
| `GET` | `/localities` | Sí |
| `GET` | `/localities/:id` | Sí |
| `POST` | `/localities` | Admin |
| `PUT` | `/localities/:id` | Admin |
| `DELETE` | `/localities/:id` | Admin |

### /institutions — 5

| Método | Ruta | Auth |
|--------|------|------|
| `GET` | `/institutions` | Sí |
| `GET` | `/institutions/:id` | Sí |
| `POST` | `/institutions` | Editor+ |
| `PUT` | `/institutions/:id` | Editor+ |
| `DELETE` | `/institutions/:id` | Editor+ |

### /instancias — 5

| Método | Ruta | Auth |
|--------|------|------|
| `GET` | `/instancias` | Sí |
| `GET` | `/instancias/:id` | Sí |
| `POST` | `/instancias` | Admin |
| `PUT` | `/instancias/:id` | Admin |
| `DELETE` | `/instancias/:id` | Admin |

---

## Estructura del proyecto

```
src/
├── app.js                  # Entry point Express
├── config/                 # database, env, jwt, knex, logger, upload
├── constants/              # estados, http-status, mensajes, roles
├── controllers/            # 25 controladores
├── middleware/             # auth, error, login-lockout, rate-limit, validation
├── repositories/           # 26 repositorios con Knex (incluyen esquemas)
├── routes/                 # 16 archivos de rutas + index.js
├── services/               # 26 servicios
└── utils/                  # columnas, errors, formatters, helpers, payload,
                            # queries, validators

migrations/                 # 32 migraciones
scripts/                    # migrar.sh (doble click), seed (datos iniciales),
                            # docker-entrypoint, docker-migrate
tests/
├── integration/            # 8 suites: auth, health, mass-assignment, territorial, login-lockout, error-cuerpo, upload-contenido, aislamiento-institucion
└── unit/                   # 15 suites: errors, utils, validators, cancha.service, etapa.service, evento.service, fixture.service, jwt-tipos, login-lockout.controller, partido.service, rate-limit-identidad, upload, columnas, env
docs/                       # README, backend-dev, frontend-dev, docker-up, diseno-carga-partido, modelo_bd.svg, tareas.txt
docker/                     # configuración de contenedores
```

---

## Base de datos

- Motor: **PostgreSQL 18.x**
- Base: `jebo_2026`
- **31 tablas**
- **1 vista**: `v_estadisticas_torneo`
- **1 función**: `actualizar_posiciones()`
- **0 triggers**
- Sin Row Level Security: el control de acceso es de aplicación, en el middleware

Para verificarlo:

```bash
docker exec jebo-db psql -U jebo -d jebo_2026 -c "\dt"
docker exec jebo-db psql -U jebo -d jebo_2026 -c "\dv"
docker exec jebo-db psql -U jebo -d jebo_2026 -c "\df"
```

Las 31 tablas:

`bitacora`, `cancha`, `cancha_horario_semanal`, `configuracion_puntaje`,
`disciplina`, `disponibilidad_cancha`, `distrito`, `equipo`, `equipo_alumno`,
`etapa`, `fecha_cancha`, `fecha_horario`, `fixture_generado`, `horarios_cancha`,
`imagenes`, `instancia`, `institucion`, `knex_migrations`,
`knex_migrations_lock`, `localidad`, `login_intentos`, `partido`, `partido_ronda`,
`posicion`, `region`, `reglamento`, `rol`, `staff_partido`, `torneo`, `usuario`,
`usuario_institucion`.

---

## Tests

```bash
npm test                # 23 suites, 390+ tests, todos en verde
npm run test:watch
npm run test:coverage
```

**Desglose (aprox):**
- Integration: 8 suites, ~180 tests
- Unit: 15 suites, ~210 tests

Los tests de integración corren contra la base `jebo_2026_test` (puerto 15432),
configurada en `tests/setup.js`. No usan la base de desarrollo.

---

## Convenciones de código

| Aspecto | Convención | Ejemplo |
|---------|------------|---------|
| Archivos | kebab-case | `usuario.repository.js` |
| Clases | PascalCase | `UsuarioService` |
| Funciones | camelCase | `findAll()` |
| Constantes | UPPER_SNAKE_CASE | `HTTP_STATUS` |
| Tablas BD | singular, snake_case | `equipo_alumno` |
| Commits | conventional | `feat:`, `fix:`, `docs:` |

### Mass-assignment: dos capas de defensa

Los controllers filtran el body con un allowlist explícito (`soloCampos`) y los
repositories validan las columnas contra `information_schema`
(`validarColumnas`, cache de 5 minutos) antes de escribir. Esto evita que un
cliente escriba columnas que no debería, como `password_hash` o `*_rol`.

---

## Docker

Ver `DOCKER.md` y `docs/docker-up.md`.

| Servicio | Puerto interno | Puerto publicado |
|----------|----------------|------------------|
| API REST | 3000 | 15252 |
| PostgreSQL | 5432 | 15432 |
| Web (nginx) | 80 | 15173 |
| pgAdmin | 80 | 5051 |

---

## Licencia

MIT (declarado en `package.json`; no hay archivo `LICENSE` en el repo).