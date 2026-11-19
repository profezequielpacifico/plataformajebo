# Sets y períodos para Vóley y Ringo — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que los partidos de vóley y ringo se jueguen set por set (al mejor de 3) en "Partido en vivo", con cierre confirmado de cada set, resultado = sets ganados y puntos por set guardados.

**Architecture:** Tabla `partido_periodo` + `evento_partido.numero_periodo`. La vista `v_marcador_partido` (única fuente del marcador para posiciones, tablas de etapa, listados y cierre) devuelve sets ganados cuando el partido tiene sets y el conteo de anotaciones cuando no. Un servicio nuevo `periodo.service.js` concentra las reglas del mejor de 3; eventos, estado y cierre de resultado lo consultan.

**Tech Stack:** Node/Express, Knex + PostgreSQL, Jest (backend, repos mockeados); React sin JSX (`createElement`), Vitest + Testing Library (frontend).

**Spec:** `docs/superpowers/specs/2026-11-19-sets-periodos-voley-ringo-design.md`

## Global Constraints

- Nunca escribir comentarios en el código (regla del usuario, sin excepciones).
- Commits sin "Co-Authored-By" ni "Generated with Claude Code".
- Solo agregar a git los archivos de cada tarea: el repo tiene cambios ajenos sin commitear (etapas, posiciones, `TournamentFormPage`, `disciplinas.js`).
- Las demás disciplinas y los partidos sin filas en `partido_periodo` se comportan exactamente igual que hoy.
- Textos: "Set" para vóley, "Período" para ringo; "Terminar set N", "Jugar set 3", "Terminar partido 2–0", "Cerrar partido X–Y".
- Estados de `partido_periodo.estado`: `'EN_JUEGO'`, `'CERRADO'`. Máximo 3 sets.

## Review Focus

- Doble toque en "Terminar set": el segundo pedido llega con un `numero` ya cerrado → 409, nunca cierra el set siguiente. (Task 3)
- Set empatado (incluido 0–0): no se puede cerrar. (Task 3)
- Partido de vóley ya "En Juego" con eventos viejos y sin sets: sigue registrando puntos en modo plano. (Task 4)
- Después de cerrar el resultado con 2–0: abrir set 3, registrar o anular → rechazado. (Task 4)
- Recarga automática de 15 s de la pantalla con un modal de confirmación abierto: el modal no se cierra ni cambia de set. (Task 5)

---

### Task 1: Migración de datos y vistas

**Files:**
- Create: `JEBO-2026-Backend/migrations/20261119100000_periodos_partido.js`

**Interfaces:**
- Produces: columnas `disciplina.marcador_por_periodos boolean not null default false`, `disciplina.nombre_periodo varchar(20)`, `disciplina.max_periodos smallint`; tabla `partido_periodo (id_partido_periodo, id_partido, numero, estado, puntos_local, puntos_visitante, id_equipo_ganador, cerrado_por, cerrado_en, creado_en)` con `unique(id_partido, numero)`, check `estado in ('EN_JUEGO','CERRADO')`, check `numero between 1 and 3`, índice único parcial `partido_periodo_en_juego_ux on (id_partido) where estado = 'EN_JUEGO'`; `evento_partido.numero_periodo smallint null`; vista `v_marcador_partido (id_partido, id_equipo_local, id_equipo_visitante, puntos_local, puntos_visitante)` con las mismas columnas y tipos que hoy; vista `v_puntos_periodo_partido (id_partido, puntos_local, puntos_visitante)`.

- [ ] **Step 1: Escribir la migración.** `up`: agrega columnas, tabla, índice y columna de evento; activa el modo con `UPDATE disciplina SET marcador_por_periodos = true, max_periodos = 3, nombre_periodo = CASE WHEN translate(lower(nombre),'óé','oe') LIKE '%ringo%' THEN 'Período' ELSE 'Set' END WHERE translate(lower(nombre),'óé','oe') ~ '(voley|voleibol|ringo)'`; reemplaza `v_marcador_partido` (CREATE OR REPLACE, mismas columnas `bigint`): si el partido tiene filas en `partido_periodo`, cuenta sets `CERRADO` ganados por cada equipo; si no, el conteo de anotaciones confirmadas de hoy. `down`: restaura `VISTA_POR_PARTIDO` de `20261107100000_marcador_partido_por_partido.js` (copiar el SQL), borra vista nueva, columna, tabla y columnas de disciplina.
- [ ] **Step 2: Probar ida y vuelta en la base de test.** `docker start jebo-test-db`, luego en `JEBO-2026-Backend` con las variables de `tests/setup.js`: `npm run migrate && npm run migrate:rollback && npm run migrate`. Esperado: sin errores las tres veces.
- [ ] **Step 3: Verificar que la vista no cambió para partidos sin sets:** un partido sin filas en `partido_periodo` devuelve el conteo de eventos; uno con sets `[L cerrado, L cerrado]` devuelve 2–0.
- [ ] **Step 4: Commit** `feat(partidos): tabla de sets y marcador por sets`.

### Task 2: Repositorio de períodos

**Files:**
- Create: `JEBO-2026-Backend/src/repositories/periodo.repository.js`
- Modify: `JEBO-2026-Backend/src/repositories/index.js` (exportar `PeriodoRepository`)
- Modify: `JEBO-2026-Backend/src/repositories/partido.repository.js` (`baseQuery`: agregar `d.marcador_por_periodos`, `d.nombre_periodo`, `d.max_periodos`)

**Interfaces:**
- Produces (`PeriodoRepository`, cada función acepta `trx` opcional al final, default `knex`):
  - `listar(id_partido, trx) -> Array<{id_partido_periodo, numero, estado, puntos_local, puntos_visitante, id_equipo_ganador, cerrado_en}>` ordenado por `numero`; para el set `EN_JUEGO` los puntos se calculan en vivo (eventos confirmados con ese `numero_periodo`), para los cerrados son los congelados.
  - `enJuego(id_partido, trx) -> fila con puntos en vivo | undefined`.
  - `abrir(id_partido, numero, trx) -> fila`.
  - `cerrar(id_partido_periodo, { puntos_local, puntos_visitante, id_equipo_ganador, cerrado_por }, trx) -> fila`.
  - `tieneSets(id_partido, trx) -> boolean`.
  - `contarEventos(id_partido, trx) -> number`.

- [ ] **Step 1: Implementar el repositorio** siguiendo el estilo de `reloj.repository.js`. Sin tests unitarios propios (los repos se mockean en la suite); lo ejercita la Task 6.
- [ ] **Step 2: `npm run lint`** en el backend. Esperado: sin errores nuevos.
- [ ] **Step 3: Commit** `feat(partidos): repositorio de sets`.

### Task 3: Reglas del mejor de 3 (`periodo.service.js`)

**Files:**
- Create: `JEBO-2026-Backend/src/services/periodo.service.js`
- Test: `JEBO-2026-Backend/tests/unit/periodo.service.test.js`

**Interfaces:**
- Consumes: `PeriodoRepository` (Task 2), `PartidoRepository.findById`, `assertArbitroAsignado` (exportarla en `module.exports` de `evento.service.js`).
- Produces:
  - `resumenSets(lista, idLocal, idVisitante) -> { local, visitante, jugados, enJuego, ganador, puedeAbrirTercero, definido }` (puro). `enJuego` = número del set en juego o `null`; `ganador` = id con 2+ sets o `null`; `puedeAbrirTercero` = 2–0 o 0–2, sin set 3 y sin set en juego; `definido` = hay ganador y no hay set en juego.
  - `periodoService.cerrar(idPartido, numero, context) -> { periodo, resumen }`.
  - `periodoService.abrirTercero(idPartido, context) -> { periodo, resumen }`.
  - `periodoService.abrirPrimeroSiCorresponde(partido, trx) -> fila | null` (crea el set 1 si `partido.marcador_por_periodos`, no hay sets y el partido no tiene eventos).
  - `periodoService.estado(partido) -> { lista, resumen } | null` (`null` si el partido no tiene sets).

- [ ] **Step 1: Tests que fallan** en `periodo.service.test.js` (mock de `../../src/repositories`, `bitacora.service` y `config/knex` igual que `evento.service.test.js`):
  - `resumenSets` con sets cerrados `[L,L]` → `{local:2, visitante:0, ganador:100, puedeAbrirTercero:true, definido:true}`; `[L,V]` + set 3 en juego → `{local:1, visitante:1, ganador:null, enJuego:3, definido:false}`; `[L,L,V]` → `{local:2, visitante:1, ganador:100, puedeAbrirTercero:false, definido:true}`.
  - `cerrar(1, 2, ctx)` con set 2 en juego 12–9 → `PeriodoRepository.cerrar` recibe `{puntos_local:12, puntos_visitante:9, id_equipo_ganador:100, cerrado_por:7}` y bitácora `CERRAR_PERIODO_PARTIDO`.
  - `cerrar` que deja 1–1 → `PeriodoRepository.abrir(1, 3, trx)`.
  - `cerrar` que deja 2–0 → no llama `abrir`.
  - `cerrar` con set empatado (incluye 0–0) → `BusinessError` "No se puede terminar un set empatado".
  - `cerrar` con `numero` distinto del set en juego → error con status 409.
  - `cerrar` con `partido.resultado_cargado = true` → error con status 409.
  - `abrirTercero` con 2–0 → abre el 3 y bitácora `ABRIR_PERIODO_PARTIDO`; con 1–1, con set 3 ya jugado o con resultado cerrado → error.
- [ ] **Step 2:** `npx jest tests/unit/periodo.service.test.js` → FAIL (módulo no existe).
- [ ] **Step 3: Implementar** `periodo.service.js`. `cerrar` y `abrirTercero` corren en `knex.transaction` con `pg_advisory_xact_lock(idPartido)` (igual que `registrar`), exigen partido "En Juego" y árbitro asignado. Para 409 usar la clase de `utils/errors` que mapee a 409 (crear `ConflictError` ahí si no existe).
- [ ] **Step 4:** `npx jest tests/unit/periodo.service.test.js` → PASS.
- [ ] **Step 5: Commit** `feat(partidos): reglas de sets al mejor de 3`.

### Task 4: Integrar sets en eventos, estado, resultado y live + rutas

**Files:**
- Modify: `JEBO-2026-Backend/src/repositories/evento.repository.js` (`registrar` recibe y graba `numero_periodo`)
- Modify: `JEBO-2026-Backend/src/services/evento.service.js` (`registrar`, `anular`)
- Modify: `JEBO-2026-Backend/src/services/partido.service.js` (`updateStatus`, `updateResult`, `findLive`)
- Modify: `JEBO-2026-Backend/src/routes/evento.routes.js` y su controller
- Modify: `JEBO-2026-Backend/src/controllers/disciplina.controller.js` (`CAMPOS_DISCIPLINA` + `marcador_por_periodos`, `nombre_periodo`, `max_periodos`)
- Test: `JEBO-2026-Backend/tests/unit/evento.service.test.js`, `JEBO-2026-Backend/tests/unit/partido.service.test.js`

**Interfaces:**
- Consumes: Task 3 (`periodoService`, `resumenSets`), Task 2.
- Produces (HTTP, todas con `authenticate, operarPartido`):
  - `POST /matches/:id/periods/close` body `{ numero: int>=1 }` → `200 { data: { periodo, resumen } }`.
  - `POST /matches/:id/periods/open` → `200 { data: { periodo, resumen } }`.
  - `GET /matches/:id/live` agrega `periodos: null` (partido sin sets) o `{ nombre, max, lista, resumen }`, y en `partido`: `marcador_por_periodos`, `nombre_periodo`, `resultado_cargado`.

- [ ] **Step 1: Tests que fallan:**
  - evento: partido por sets con set 2 en juego → `EventoRepository.registrar` recibe `numero_periodo: 2`.
  - evento: partido por sets sin set en juego → `BusinessError` "No hay un set en juego".
  - evento: partido por sets con `resultado_cargado: true` → rechazado; mismo para `anular`.
  - evento: anular un evento con `numero_periodo` de un set `CERRADO` → `BusinessError` "El set ya está cerrado".
  - evento: partido de disciplina por períodos **sin** sets (modo viejo) → registra con `numero_periodo: null`.
  - partido: `updateStatus(id, 'En Juego')` → llama `periodoService.abrirPrimeroSiCorresponde`.
  - partido: `updateResult` en partido por sets con reloj `PENDIENTE`, sin set en juego y 2–0 → cierra; con set en juego → `BusinessError`; sin ganador → `BusinessError`.
  - partido: `updateResult` en partido sin sets con reloj `PENDIENTE` → sigue rechazando como hoy.
- [ ] **Step 2:** `npx jest tests/unit/evento.service.test.js tests/unit/partido.service.test.js` → FAIL en los nuevos.
- [ ] **Step 3: Implementar** los cambios listados en Files y las dos rutas (validación `body('numero').isInt({ min: 1 })`).
- [ ] **Step 4:** `npx jest tests/unit` → PASS completo.
- [ ] **Step 5: Commit** `feat(partidos): sets en eventos, cierre y partido en vivo`.

### Task 5: Pantalla "Partido en vivo" en modo sets

**Files:**
- Modify: `JEBO-2026-Frontend/src/services/matchService.js` (`closePeriod(id, numero)`, `openPeriod(id)`)
- Create: `JEBO-2026-Frontend/src/pages/matches/PanelSets.js`
- Modify: `JEBO-2026-Frontend/src/pages/matches/MatchLivePage.js` (si `live.periodos` existe: marcador de sets + `PanelSets`; columna "Set" en el historial; el reloj no bloquea el cierre)
- Modify: `JEBO-2026-Frontend/src/pages/disciplines/DisciplineFormPage.js` (checkbox "Se juega por sets/períodos", nombre y máximo)
- Test: `JEBO-2026-Frontend/tests/pages/matches/MatchLivePage.test.jsx`

**Interfaces:**
- Consumes: respuesta de `GET /matches/:id/live` (Task 4).
- Produces: `PanelSets({ periodos, equipos, nombre, busy, cerrado, onCerrarSet(numero), onAbrirTercero(), onCerrarPartido() })`.

- [ ] **Step 1: Tests que fallan** en `MatchLivePage.test.jsx` (con `live.periodos` mockeado):
  - muestra el marcador de sets 1–0, la fila "Set 1: 25–20" y "Set 2" en juego con 12–9.
  - "Terminar set 2" abre un modal con "¿Terminar el set 2 con 12–9? Lo gana Región 1."; al confirmar llama `matchService.closePeriod(1, 2)`.
  - set en juego 5–5 → "Terminar set 2" deshabilitado y el texto "No se puede terminar un set empatado".
  - 2–0 sin set 3 → botones "Jugar set 3" y "Terminar partido 2–0"; "Terminar partido 2–0" pide dos confirmaciones antes de llamar `matchService.updateResult`.
  - 2–1 → "Cerrar partido 2–1" con una confirmación.
  - con `live.periodos = null` la pantalla es la de hoy (los tests existentes siguen pasando).
  - una recarga del live mientras el modal está abierto no lo cierra.
- [ ] **Step 2:** `npx vitest run tests/pages/matches/MatchLivePage.test.jsx` → FAIL.
- [ ] **Step 3: Implementar.** El nombre del período sale de `live.periodos.nombre` ("Set"/"Período").
- [ ] **Step 4:** `npx vitest run tests/pages/matches` → PASS.
- [ ] **Step 5: Commit** `feat(partido-en-vivo): marcador y cierre por sets`.

### Task 6: Verificación en local

- [ ] **Step 1:** Reconstruir y levantar la API y la web locales de Docker.
- [ ] **Step 2:** En la app local (http://localhost:15173), con un partido de una disciplina por sets: pasar a "En Juego", sumar puntos, terminar set 1 y set 2 (2–0), "Jugar set 3", terminarlo, cerrar 2–1, finalizar. La tabla suma los sets.
- [ ] **Step 3:** Un partido de fútbol local sigue funcionando igual.
