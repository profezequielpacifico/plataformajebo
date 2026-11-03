# JEBO 2026 — Frontend

Interfaz web del Sistema Administrativo de Torneos Deportivos JEBO 2026.

Cliente de la API REST del backend (`JEBO-2026-Backend`): React 19 compilado con
Vite. **NO usa Tailwind en el markup** (aunque está instalado); los estilos son
inline desde `src/styles/theme/*.js`. Iconos SVG propios (27) en
`src/components/icons/index.js` — `lucide-react` está declarado pero no se usa.

---

## Stack tecnológico

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 19.2.6 | Biblioteca UI |
| React DOM | 19.2.6 | Renderizado |
| Vite | 8.0.13 | Bundler y dev server |
| @vitejs/plugin-react | 6.0.2 | Integración React + HMR |
| Tailwind CSS | 4.3.0 | Instalado pero **no usado en markup** |
| @tailwindcss/postcss | 4.3.0 | Plugin PostCSS (configurado) |
| lucide-react | 1.16.0 | Declarado pero **no usado** (iconos propios) |
| ESLint | 10.2.1 | Lint |
| Vitest | 1.6.0 | Tests (configurado en `vite.config.js`) |

> **Tests**: sí hay suite (`npm run test`, `npm run test:watch`,
> `npm run test:coverage` en `package.json`). 12 archivos en `tests/`.

---

## Requisitos

- Node.js 18+
- npm
- La API del backend levantada (por defecto en `http://localhost:15252`)

---

## Instalación

```bash
git clone git@github.com:tecnican2programacion/JEBO-2026-FRONTEND.git
cd JEBO-2026-Frontend
npm install
```

### Ejecutar

```bash
npm run dev       # dev server de Vite (puerto 4000)
npm run build     # build de producción en dist/
npm run preview   # sirve dist/
npm run lint      # eslint
npm run test      # vitest run
npm run test:watch
npm run test:coverage
```

El dev server escucha en el **puerto 4000** (`vite.config.js`).

---

## Conexión con la API

El frontend no llama al backend directamente por URL absoluta: usa el prefijo
`/api` y deja que el proxy lo resuelva.

| Entorno | Configuración |
|---------|---------------|
| Desarrollo | `src/config/env.js` define `BASE_URL: import.meta.env.VITE_API_URL \|\| '/api'` |
| Dev server | `vite.config.js` hace proxy de `/api` hacia `VITE_PROXY_TARGET \|\| http://localhost:15252` y reescribe quitando el prefijo `/api` |
| Producción | `nginx.conf` sirve `dist/` y hace `proxy_pass http://api:3000/` |

Es decir, en desarrollo el frontend llama a `/api/tournaments` y el proxy lo
convierte en `GET http://localhost:15252/tournaments` contra la API real.

Para apuntar a otro origen:

```bash
VITE_API_URL=https://api.ejemplo.com npm run dev
# o
VITE_PROXY_TARGET=http://localhost:3000 npm run dev
```

Las rutas de la API están en inglés y **sin** prefijo `/api`. Ver el README del
backend para el inventario completo (109 endpoints aprox).

---

## Estructura del proyecto

```
src/
├── api/index.js              # Cliente HTTP (fetch + Bearer + refresh token)
├── app.js                    # Enrutado propio + sesión + montaje React (194 líneas)
├── react-shim.js             # Expone React en globalThis
├── components/
│   ├── icons/index.js        # 27 iconos SVG propios
│   ├── standings/ClassicStandingsTable.js  # Sin uso
│   └── ui/                   # 8 componentes: Badge, CalendarField, Card,
│                             # DeporteSelector (sin uso), ErrorAlert, Loading,
│                             # Modal, Table
├── config/
│   ├── constants.js          # ROUTES (53), USER_ROLES, STATUSES, etc.
│   └── env.js                # BASE_URL, TIMEOUT, STORAGE_KEYS
├── hooks/useResponsive.js    # Único hook del proyecto
├── layouts/MainLayout.js     # Sidebar + header + contenido (485 líneas)
├── pages/                    # 39 páginas en 17 carpetas de dominio
├── providers/                # AppProvider, AuthProvider, DataProvider (SIN USO)
├── services/                 # 16 servicios, uno por recurso
└── styles/
    ├── *.css                 # variables, globals, layout, components, responsive (solo components.css se importa)
    └── theme/                # 9 módulos JS: colors, spacing, typography, breakpoints, shadows, radius, transitions, zIndex, index
```

Otros archivos en la raíz: `index.html`, `vite.config.js`, `tailwind.config.js`,
`postcss.config.js`, `jsconfig.json`, `nginx.conf`, `Dockerfile`,
`sonar-project.properties`.

### Páginas por dominio

| Carpeta | Páginas (archivo) |
|---------|-------------------|
| `auth/` | LoginPage, RegisterPage, RecoverPasswordPage |
| `dashboard/` | DashboardPage |
| `tournaments/` | TournamentPage, TournamentListPage, TournamentFormPage, TournamentRegistrationPage |
| `teams/` | TeamListPage, TeamFormPage, EnrolledTeamsPage |
| `matches/` | MatchListPage, MatchFormPage, MatchDetailPage, MatchLivePage, MisPartidosPage |
| `standings/` | StandingsPage, QualifiedPage, FinalPage |
| `users/` | UserListPage, UserFormPage |
| `disciplines/` | DisciplinesListPage, DisciplineFormPage |
| `courts/` | CourtListPage, CourtFormPage |
| `configuration/` | RegionsPage, RegionFormPage |
| `districts/` | DistrictsListPage, DistrictsFormPage |
| `localities/` | LocalitiesListPage, LocalitiesFormPage |
| `institutions/` | InstitutionsListPage, InstitutionFormPage |
| `instancias/` | InstanciasListPage |
| `stages/` | StagesListPage |
| `advanced/` | AdvancedOptionsPage, AutoFixturePage, LockedIpsPage |
| `audit/` | AuditPage, actionLabels.js |

---

## Rutas y control de acceso

**No usa `react-router`**. El enrutado es propio en `src/app.js`:

- **53 rutas** definidas en `src/config/constants.js` (`ROUTES`).
- **3 públicas**: `login`, `register`, `recover-password`.
- **50 privadas**: requieren sesión (`renderProtectedPage` redirige a login).
- **El frontend NO evalúa roles al enrutar**. Cualquier usuario autenticado
  puede navegar a cualquier ruta privada. El control real está en la API
  (`requireAdmin`, `requireEditorOrAbove`, `requireArbitroOrAdmin`).

### Menú lateral por rol (`MainLayout.js`)

| Rol | Menú visible |
|-----|--------------|
| **Administrador** (`id_rol 1`) | Todos los grupos + "Mis Partidos" en Competencia |
| **Profesor** | **Igual que Administrador** (ver observaciones) |
| **Arbitro** (`id_rol 10`) | Solo **General**: Inicio y Mis Partidos |

> **Inconsistencia**: `getMenuGroups()` devuelve menú completo para cualquier
> rol que no sea Administrador ni Arbitro. Un **Profesor ve el mismo menú
> que un Administrador** (incluye Usuarios, Actividad, Opciones Avanzadas).

### Rutas duplicadas (dos rutas → misma página)

| Página | Rutas |
|--------|-------|
| `TournamentPage` | `tournaments` (menú) y `tournament` (sin menú) |
| `TournamentFormPage` | `tournaments-new`, `tournaments-edit`, `tournaments-view` |
| `MatchFormPage` | `matches-new`, `matches-edit`, `create-matches` |
| `DisciplinesListPage` | `sports` (menú) y `disciplines` (sin menú) |
| `DisciplineFormPage` | `sports-new`, `sports-edit`, `sports-view` |

### Parámetros de ruta

Sin query strings. El parámetro se separa con `/` y llega como `matchId`:
`matches-detail/17` → `matchId: '17'`, `teams-edit/8` → `pageParams: { id: '8' }`.
El nombre del prop **depende de la ruta**, no del tipo de entidad.

---

## Roles

En `src/config/constants.js` (`USER_ROLES`), coinciden con el backend:

| Constante | Valor |
|-----------|-------|
| `ADMIN` | `Administrador` |
| `PROFESOR` | `Profesor` |
| `ARBITRO` | `Arbitro` |

No existen "Editor" ni "Visualizador".

---

## Estados de partido

Definidos en backend y consumidos por UI:

| Estado | Color |
|--------|-------|
| Programado | `#4caf50` |
| En Juego | `#2196f3` |
| Finalizado | `#ff9800` |
| Cancelado | `#f44336` |
| Pendiente | — |

---

## Sistema de diseño

**Tokens en JavaScript** (`src/styles/theme/*.js`, 9 módulos), reexportados por
`index.js` como `styles` (objeto con estilos compuestos) y `COLORS`,
`SPACING`, `TYPOGRAPHY`, etc.

| Módulo | Qué define |
|--------|------------|
| `colors.js` | `primary #0066cc`, `success`, `danger`, `warning`, `background`, `surface`, `text*`, `statusScheduled`, `statusInProgress`, `statusCanceled`, `statusFinished` |
| `spacing.js` | `xs 4px` … `2xl 48px` |
| `typography.js` | Familia `Inter`, tamaños `xs 12` … `3xl 30`, pesos, interlineados |
| `radius.js` | `none` … `full 9999px` |
| `shadows.js` | `sm` … `xl` |
| `transitions.js` | `fast 150ms` … `default 200ms` |
| `zIndex.js` | `dropdown 1000` … `tooltip 1070` |
| `breakpoints.js` | `sm 640` … `2xl 1536` (solo informativos) |

**NO hay Tailwind en el markup**. `tailwind.config.js` tiene `theme.extend` vacío.
`globals.css` usa directivas Tailwind 3 (`@tailwind base/components/utilities`)
que **no funcionan en Tailwind 4**. Las hojas `variables.css`, `layout.css`,
`responsive.css` **no se importan en ningún lado** (sus clases no tienen efecto).

La única CSS importada es `src/styles/components.css` (por `MatchListPage.js`).

---

## Flujo de datos real

```
UI (pages / components)
    ↓
useState / useEffect (no hay hooks custom salvo useResponsive)
    ↓
Services (16) — un módulo por recurso
    ↓
API (src/api/index.js) — fetch + Bearer + refresh automático con cola
    ↓
Backend REST (/api → proxy → http://localhost:15252)
```

**Providers (`src/providers/`) existen pero NO se usan** en ninguna página.
La sesión se maneja en `app.js` con `useState` + `localStorage`.

---

## Docker

| Servicio | Puerto interno | Puerto publicado |
|----------|----------------|------------------|
| Web (nginx) | 80 | 15173 |
| API (backend) | 3000 | 15252 |

`nginx.conf` sirve `dist/` y hace `proxy_pass` de `/api` a `http://api:3000/`.

---

## Tests

```bash
npm run test                # vitest run
npm run test:watch
npm run test:coverage
```

- 12 archivos en `tests/` (components, layouts, pages).
- Config en `vite.config.js`: jsdom, globals, setup `tests/setup.js`.
- Cobertura excluye `src/app.js`, `src/config/constants.js`, `components/icons/**`.

---

## Convenciones

| Aspecto | Convención | Ejemplo |
|---------|------------|---------|
| Componentes y páginas | PascalCase + `Page` | `TournamentListPage.js` |
| Extensión | `.js` para casi todo | (no hay `.jsx` en src) |
| Hooks | `useX` | `useResponsive.js` |
| Funciones | camelCase | `handleSubmit()` |
| Constantes | UPPER_SNAKE_CASE | `USER_ROLES` |
| Commits | conventional | `feat:`, `fix:`, `docs:` |

---

## Licencia

`UNLICENSED` (declarado en `package.json`). Todos los derechos reservados.

---

## Documentación extendida

Ver `/srv/shared/Desktop/JEBO-2026-Docs/` para:

- `01-arquitectura-frontend.md` — enrutado, sesión, capas
- `02-sistema-de-diseno.md` — tokens, componentes, iconos
- `03-mapa-de-rutas.md` — 53 rutas, menú por rol, permisos
- `04-servicios-y-api.md` — 16 servicios, endpoints, cliente HTTP
- `paginas/` — 39 fichas página por página (plantilla de 9 secciones)
- `historico/` — material original de mayo 2026 (recuperado de git)