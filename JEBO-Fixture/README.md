# JEBO Fixture

Consulta pública del fixture de los Juegos Escolares Bonaerenses: encuentros,
equipos, fechas, horarios y canchas de cada competencia.

Es una aplicación independiente de **solo lectura** y **sin login**. No tiene
backend ni base de datos propios: toma toda la información de la API pública de
JEBO-2026 (`/public`), que es la única fuente de verdad.

## Qué muestra

- **Inicio**: el encuentro en juego o el próximo, una tira con la cantidad de
  encuentros por día (dos semanas, coloreada por disciplina), los indicadores
  generales, los próximos encuentros por día y los últimos resultados.
- **Programación**: todos los encuentros de la selección, ordenados por fecha o
  agrupados por disciplina.
- **Filtros dependientes**: región educativa → torneo → etapa. Cada filtro solo
  ofrece opciones que existen para los anteriores, y al cambiar uno se limpian
  los que dependen de él. Los filtros viven en la URL, así que un enlace
  compartido abre la misma selección.
- **Dos modalidades**: los partidos (`MARCADOR`) se muestran como enfrentamiento
  con marcador; las presentaciones (`EVALUACION`, por ejemplo gimnasia) muestran
  la delegación participante, sin "vs".
- **Actualización**: cada 60 segundos mientras la pestaña está visible, al volver
  a la pestaña y con el botón Actualizar. El encabezado muestra la hora de la
  última actualización correcta. Si una actualización falla, se siguen mostrando
  los últimos datos con un aviso.

## Requisitos

- Node.js 20 o superior
- La API de JEBO-2026 con el módulo `/public` (rama `feat/api-publica-fixture`
  del repo `plataformajebo`), o el modo mock para trabajar sin backend

## Desarrollo

```bash
npm install
cp .env.example .env.local
npm run dev
```

La app queda en `http://localhost:15174`. En desarrollo, Vite reenvía `/api/*` a
`VITE_API_PROXY_TARGET` quitando el prefijo `/api`, igual que el nginx de
JEBO-2026 en producción.

Sin backend, con datos de ejemplo generados en el navegador:

```bash
npm run dev:mock
```

El mock solo se carga cuando `VITE_USE_MOCK=true` y no entra en el build de
producción.

## Variables de entorno

| Variable | Valor por defecto | Uso |
|----------|-------------------|-----|
| `VITE_API_URL` | `/api/public` | Base de la API pública. Puede ser absoluta (`https://jebo.example/api/public`) |
| `VITE_API_PROXY_TARGET` | — | Solo desarrollo: backend al que Vite reenvía `/api` |
| `VITE_REFRESH_MS` | `60000` | Intervalo de actualización automática |
| `VITE_USE_MOCK` | `false` | `true` usa datos de ejemplo en lugar de la API |

No hay secretos: todo lo que empieza con `VITE_` queda visible en el navegador.

## Scripts

| Script | Qué hace |
|--------|----------|
| `npm run dev` | Servidor de desarrollo contra la API |
| `npm run dev:mock` | Servidor de desarrollo con datos de ejemplo |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve el build localmente |
| `npm test` | Tests unitarios y de componentes (Vitest) |

## Estructura

```
src/
├── components/
│   ├── layout/      Header, DashboardLayout
│   ├── filters/     RegionFilter, TournamentFilter, StageFilter, FilterBar
│   ├── fixture/     FixtureCard, MatchCard, ParticipationCard, FixtureList, estados
│   └── dashboard/   SummaryCard, DayStrip, UpcomingEvents
├── pages/           Dashboard, Fixture, NotFound
├── services/        api.js (único punto que llama a fetch) y servicios por recurso
├── hooks/           useRegions, useTournaments, useFilters, useFixture
├── utils/           fechas, formato y agrupación del fixture
├── mocks/           datos de ejemplo para el modo mock
├── styles/          variables, global, layout y estilos por componente
└── tests/
```

## Solo lectura

- `services/api.js` es el único archivo que llama a `fetch`, siempre con `GET` y
  `credentials: 'omit'`. Un test (`src/tests/readOnly.test.js`) falla si aparece
  otro método, credenciales o almacenamiento de tokens.
- La garantía real está en la API: `/public` solo acepta `GET`, `HEAD` y
  `OPTIONS` y responde `405` a todo lo demás.

## Contrato de `/public/fixture`

Cada encuentro llega así:

```json
{
  "tipo": "PARTIDO",
  "id": 12,
  "clave": "PARTIDO-12",
  "disciplina": { "id": 1, "nombre": "Fútbol", "tipo_competencia": "MARCADOR" },
  "torneo": { "id": 10, "nombre": "Fútbol masculino", "categoria": "Sub-16" },
  "etapa": { "id": 101, "nombre": "Etapa Regional", "orden": 1 },
  "fecha": "2026-11-20",
  "hora": "10:00",
  "estado": "PROGRAMADO",
  "cancha": { "id": 1, "nombre": "Polideportivo Municipal", "ubicacion": "Calle 7 y 50", "link_maps": null },
  "equipos": [
    { "id": 1, "nombre": "EEST N° 2", "institucion": "…", "rol": "LOCAL" },
    { "id": 2, "nombre": "EES N° 14", "institucion": "…", "rol": "VISITANTE" }
  ],
  "resultado": null
}
```

Estados posibles: `PROGRAMADO`, `PENDIENTE`, `EN_JUEGO`, `FINALIZADO`,
`SUSPENDIDO` y `CANCELADO`. `fecha`, `hora` y `cancha` pueden venir en `null`
cuando todavía no están asignados.

## Pendiente

- Publicación (Fase 7): hosting, dominio, HTTPS y `PUBLIC_CORS_ORIGIN` en
  JEBO-2026 con el dominio definitivo.
- Resultado de presentaciones: la API pública todavía no lo expone.
