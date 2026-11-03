# Módulo "Carga de Partido" — Diseño técnico

> Especificación del módulo, escrita antes de codificar y actualizada después.
> Sirve para dos cosas: dejar por escrito **por qué** se decidió cada cosa (la
> parte que no se deduce leyendo el código), y dejar constancia de lo que
> quedó abierto.
>
> **Estado: implementado y verificado** (ver §12.1). Las secciones §1-§11
> describen el diseño tal como se construyó; donde la implementación se
> desvió, la nota está en la sección correspondiente.

---

## 1. Objetivo

Reemplazar la carga manual del resultado por un **ledger de eventos** por
partido, sobre el que se deriva el marcador, más un **reloj de partido** con
pausa. El sistema pasa de "el árbitro escribe 3 - 1" a "el árbitro registra cada
anotación, y el resultado sale de la cuenta de los eventos válidos".

---

## 2. Auditoría del estado actual

Antes de diseñar, lo que ya existe (verificado en el código):

| Pieza | Estado | Ubicación |
| --- | --- | --- |
| Múltiples árbitros por partido | **Ya existe** | `staff_partido` (N:N partido↔usuario) |
| Autorización "solo árbitros asignados" | **Ya existe** | `_assertArbitroAsignado()` en `partido.service.js:22` |
| Rol `Arbitro` + guard que exige ser el arbitro **asignado** | **Ya existe** | `operarPartido`, en `src/middleware/autorizacion.js` |
| Bitácora de auditoría | **Ya existe** | `bitacora.service`, ya usada por todos los servicios |
| Aislamiento por institución (X-05) | **Ya existe** | `alcance.service.js`, `filtrarPorEquipos` |
| Estados `Pendiente/Programado/En Juego/Finalizado/Cancelado` | **Ya existe** | `src/constants/estados.js` |

Lo que **no** existe y es el trabajo nuevo:

| Pieza | Gap |
| --- | --- |
| Ledger de eventos | El marcador son 2 contadores desnormalizados (`goles_local`, `goles_visitante`). No hay historial, ni trazabilidad, ni anulación. |
| Reloj de partido | No existe. El `hora` de la cancha es la hora *programada*, no el cronómetro del encuentro. |
| Pausa / reanudación | No hay forma de.stop un partido sin perder el tiempo ya jugado. |
| Estado `Suspendido` | No está en `ESTADOS_PARTIDO`. |
| Rol de árbitro (principal/asistente) | `staff_partido` no tiene columna de rol. |
| Pestaña "Partido en vivo" | El frontend tiene un modal donde el árbitro tipea los números. |

---

## 3. Decisiones tomadas

| # | Decisión | Elección | Motivo |
| --- | --- | --- | --- |
| D1 | Fuente de verdad del marcador | **Derivada del ledger** | Un solo origen. Imposible que el contador y la lista de eventos se desincronicen. |
| D2 | Unidad del evento | **`evento_partido` genérico con `tipo_evento`** | El sistema tiene 4 deportes (Fútbol, Futsal, Baloncesto, Voleibol). "Punto" no significa lo mismo en todos, pero el ledger sí. |
| D3 | Reloj | **Con pausa** (`inicio` + `acumulado` + `reloj_iniciado_en`) | Una pausa por lluvia no puede reiniciar el cronómetro. |
| D4 | Árbitros | **Con rol** (`PRINCIPAL` / `ASISTENTE`) | Ya se pidió, y no es costoso ahora. |

**Explícito:** no se implementa override administrativo del resultado. Si más
adelante hace falta corregir un resultado, se agrega como una función de
corrección auditada, no como una segunda fuente de verdad desde el diseño.

---

## 4. Modelo de datos

### 4.1 `evento_partido` (nueva)

```sql
CREATE TABLE evento_partido (
  id_evento           serial PRIMARY KEY,
  id_partido          integer NOT NULL REFERENCES partido(id_partido) ON DELETE CASCADE,
  numero_evento       integer NOT NULL,
  tipo_evento         varchar(30) NOT NULL DEFAULT 'ANOTACION',
  id_equipo           integer NOT NULL REFERENCES equipo(id_equipo) ON DELETE RESTRICT,
  id_usuario_arbitro  integer REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
  registrado_por      integer REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
  segundos_partido    integer,          -- NULL solo en eventos migrados
  hora_real           timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado              varchar(20) NOT NULL DEFAULT 'CONFIRMADO',
  idempotency_key     varchar(64),
  anulado_por         integer REFERENCES usuario(id_usuario) ON DELETE SET NULL,
  anulado_en          timestamp,
  motivo_anulacion    text,
  creado_en           timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Un evento por número, dentro del partido. Esto hace que el `numero_evento`
-- sea fiable como identificador legible y que un doble-post se detectable.
CREATE UNIQUE INDEX evento_partido_partido_numero_uk
  ON evento_partido (id_partido, numero_evento);

-- Doble clic / retry de red: la misma clave no crea dos eventos.
CREATE UNIQUE INDEX evento_partido_idem_uk
  ON evento_partido (id_partido, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Índice de apoyo para el cálculo del marcador.
CREATE INDEX evento_partido_marcador_ix
  ON evento_partido (id_partido, id_equipo)
  WHERE estado = 'CONFIRMADO' AND tipo_evento = 'ANOTACION';
```

**Decisiones de detalle:**

- `segundos_partido` es **`integer`, no `interval` ni `mm:ss`**. Es ordenable,
  agregable, no depende de locale ni de zona horaria, y formatearlo es cosa del
  frontend. Guardar `"16:33"` como texto obligaría a parsear en cada consulta.
- `hora_real` lo genera la base (`DEFAULT CURRENT_TIMESTAMP`). **El cliente
  nunca la manda.** Es un dato de auditoría: si lo aceptáramos del body, un
  árbitro podría retrodatar un gol.
- `id_usuario_arbitro` y `registrado_por` son **columnas distintas a
  propósito**. En el flujo normal coinciden (el árbitro se registra a sí mismo),
  pero divergen cuando un Administrador carga en nombre de un árbitro. Para
  auditoría interesa saber quién *tocó* el botón, no solo a nombre de quién
  se lo cargó.
- **`id_usuario_arbitro` y `registrado_por` son NULL-ables, y la FK es
  compuesta** (`FOREIGN KEY (id_partido, id_usuario_arbitro) REFERENCES
  staff_partido (...) MATCH SIMPLE`). Esto contradice el `NOT NULL` del diseño
  original, y fue deliberado:

  Seis partidos con resultado cargado (73, 92, 94, 97, 98, 99) **no tienen
  árbitro asignado**. El backfill deriva de esos resultados, así que sus eventos
  no tienen a quién atribuirlos. Las alternativas eran inventar un árbitro —lo que
  pondría en el historial de auditoría el nombre de una persona que nunca
  estuvo en esa cancha— o romper la regla de "todo evento registra quién lo
  hizo". Registrar el desconocido es más honesto que registrar algo falso.

  Por eso es `MATCH SIMPLE` y no `MATCH FULL`: con `MATCH FULL`, un `NULL` en
  cualquiera de las dos columnas haría fallar la restricción y el backfill no
  podría correr. Con `MATCH SIMPLE` la fila con `NULL` simplemente se salta la
  comprobación, y el evento queda con el árbitro desconocido.

  La regla no se relaja en el código: `eventoService` **exige** árbitro
  asignado para registrar eventos nuevos. El `NULL` es un hecho del pasado, no
  una puerta abierta para el futuro.

  **El `NULL` tiene además un segundo uso, y es el caso del día a día:** el
  Administrador. `assertArbitatigoAsignado` lo deja pasar (administra todo), pero
  un admin **no está en `staff_partido`** de ningún partido —no arbitra, sólo
  gestiona—, así que escribir su id en `id_usuario_arbitro` viola la FK
  compuesta y el `INSERT` revienta con un **500**.

  Por eso `assertArbitatigoAsignado` devuelve el árbitro al que se atribuye la
  operación, y para el admin devuelve `null`: el evento queda sin árbitro
  atribuido y con el admin en `registrado_por`. Es exactamente para lo que
  existen las dos columnas separadas. Lo que **no** se hace es agregar al admin
  al `staff_partido` para "que la FK lo deje pasar": eso lo convertiría en
  árbitro de un partido en el que jamás arbitró, y el `staff` se usa para
  listar quién está a cargo.

  La consecuencia de la división es que la columna "Árbitro" de la tabla del
  frontend tiene tres casos, no uno: árbitro asignado (su nombre), evento
  cargado por un admin (el nombre del admin, marcado como tal), y evento del
  backfill sin autor conocido (que se muestra como tal, no como un «—» que
  parece un dato faltante por error).
- `ON DELETE CASCADE` desde `partido`: si se borra un partido, sus eventos
  desaparecen con él. Es coherente con lo que ya hace `staff_partido`.
- `ON DELETE RESTRICT` a `equipo` y `usuario`: un evento es un hecho histórico
  que **no** debe evaporarse porque se dé de baja un equipo o un usuario.

**Sobre el tipo de evento (D2).** `tipo_evento` arranca con un solo valor en
uso, pero el esquema ya soporta los que vengan después:

```
ANOTACION         → el único habilitado en v1
TARJETA_AMARILLA
TARJETA_ROJA
FALTA
CAMBIO
SET               → para Voleibol (requiere el trabajo de períodos que se pospuso)
TIEMPO_MUERTO
```

El nombre visible lo decide el frontend según la disciplina
(`Gol` / `Punto`), no el backend. La tabla `disciplina` ya existe con
`nombre` y `reglamento`, así que la tabla de sinónimos se puede agregar sin
tocar el ledger.

### 4.2 `partido` — columnas de reloj

```sql
ALTER TABLE partido
  ADD COLUMN reloj_estado        varchar(20) NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN reloj_iniciado_en   timestamp,          -- segmento en curso
  ADD COLUMN reloj_acumulado_seg integer     NOT NULL DEFAULT 0;

CREATE INDEX partido_reloj_ix ON partido (reloj_estado)
  WHERE reloj_estado = 'EN_CURSO';
```

El tiempo transcurrido **nunca se almacena**. Se deriva:

```
EN_CURSO  →  reloj_acumulado_seg + (now() - reloj_iniciado_en)
PAUSADO   →  reloj_acumulado_seg
```

Guardar un contador que se incrementa cada segundo es una fuente de error
clásica: se desincroniza con pausas, con reinicios del proceso y con
correcciones manuales. Con esta fórmula el reloj no tiene estado propio que
pueda mentir.

El índice parcial existe para una consulta operativa concreta: "partidos en
curso ahora", que es la que va a alimentar un tablero en vivo.

**Nota sobre `Suspendido`:** `partido.estado` es `varchar(20)` **sin CHECK
constraint** (verificado en `001_baseline.sql:853`), así que agregar el valor es
solo agregar la constante a `ESTADOS_PARTIDO` y a los `isIn()` de las rutas.
No hay migración de schema para ese estado. Lo que sí hay que revisar es que
`actualizar_posiciones` filtra por `estado = 'Finalizado'`, así que un partido
`Suspendido` queda automáticamente fuera del conteo — que es lo correcto.

### 4.3 `staff_partido` — rol del árbitro

```sql
ALTER TABLE staff_partido ADD COLUMN rol varchar(20) NOT NULL DEFAULT 'ASISTENTE';

ALTER TABLE staff_partido
  ADD CONSTRAINT staff_partido_rol_ck
  CHECK (rol IN ('PRINCIPAL', 'ASISTENTE'));
```

`DEFAULT 'ASISTENTE'` para que las filas existentes sigan siendo válidas sin
backfill. Cuando se cargan varios árbitros desde la UI, el primero se marca
`PRINCIPAL` a mano; no se fuerza "exactamente un principal" porque la regla
real ("siempre hay un principal disponible") es de negocio, no de integridad
referencial, y un CHECK no podría expresar "al menos uno" sin un trigger.

### 4.4 Migración de datos (backfill)

**Este es el punto que más fácilmente se pasa por alto y el que rompe todo si se
ignora.** Hoy hay partidos finalizados con `goles_local` / `goles_visitante`
cargados y **cero eventos**. Si el marcador pasa a derivarse del ledger, esos
partidos pasan a tener marcador `0 - 0` y `actualizar_posiciones` los cuenta
como derrotas por goleada 0-0 para ambos equipos. En un torneo con historial,
eso es corrupción de datos.

La migración tiene que **sintetizar los eventos de los partidos ya jugados**:

```sql
-- Por cada partido con resultado cargado, generar un evento ANOTACION
-- por cada gol. segundos_partido queda NULL (no se conoce el momento real),
-- estado = 'CONFIRMADO' para que cuente, y un flag de origen para poder
-- distinguirlos y para que la UI no finja que conoce el minuto del gol.
```

Los eventos migrados son legítimamente incompletos en el campo de tiempo, y por
eso `segundos_partido` es nullable. La UI debe mostrar `—` en esa columna para
ellos en lugar de `00:00`.

**Recomendación operativa:** correr el backfill en una migración separada de la
que crea la tabla, para poder verificar el conteo antes de seguir:

```sql
SELECT count(*) FROM partido WHERE resultado_cargado AND estado = 'Finalizado';
-- debe coincidir con el total de eventos sintetizados
```

### 4.5 El marcador derivado

Una vista resuelve el 90% del problema y deja la regla de negocio escrita una
sola vez, en la base:

```sql
CREATE OR REPLACE VIEW v_marcador_partido AS
SELECT
  p.id_partido,
  p.id_equipo_local,
  p.id_equipo_visitante,
  COALESCE(ec_local.n, 0)  AS puntos_local,
  COALESCE(ec_visit.n, 0)  AS puntos_visitante,
  COALESCE(ec_local.n, 0) - COALESCE(ec_visit.n, 0) AS diferencia
FROM partido p
LEFT JOIN (
  SELECT id_partido, id_equipo, count(*) AS n
  FROM evento_partido
  WHERE estado = 'CONFIRMADO' AND tipo_evento = 'ANOTACION'
  GROUP BY id_partido, id_equipo
) ec_local  ON ec_local.id_partido  = p.id_partido
            AND ec_local.id_equipo  = p.id_equipo_local
LEFT JOIN (
  SELECT id_partido, id_equipo, count(*) AS n
  FROM evento_partido
  WHERE estado = 'CONFIRMADO' AND tipo_evento = 'ANOTACION'
  GROUP BY id_partido, id_equipo
) ec_visit  ON ec_visit.id_partido  = p.id_partido
            AND ec_visit.id_equipo  = p.id_equipo_visitante;
```

Lo que se hace con `goles_local` / `goles_visitante` (que **no** se borran en
esta iteración, por compatibilidad con reportes ya existentes y con
`v_estadisticas_torneo`):

1. Se los deja de escribir en toda la faz de carga. `PATCH /matches/:id/result`
   deja de aceptar valores y pasa a ser un endpoint de cierre que recalcula
   desde la vista.
2. `actualizar_posiciones` se reescribe para leer de `v_marcador_partido`.
3. Se agrega `goles_local` y `goles_visitante` a la lista de `bloquear` del
   `crud()` de `partido`, para que ningún `PUT` pueda reintroducir la
   escritura manual por la puerta de atrás.

Es un período de transición, y conviene decirlo con todas las letras: durante
la transición conviven dos representaciones. La condición para que no se
desincronicen es que la única que se escribe es la función de cierre, en la
misma transacción que sella el partido como `Finalizado`. Cuando todos los
reportes y vistas lean de `v_marcador_partido`, las columnas se pueden dejar de
leer y finalmente dropear.

---

## 5. Impacto en `actualizar_posiciones`

Hoy la función (definida en `20260926120000_etapa_en_partido_y_posicion.js`)
lee `p.goles_local` y `p.goles_visitante` directamente en su CTE `pares`. Con
marcador derivado, hay que cambiar esa parte a:

```sql
pares AS (
  SELECT
    p.id_partido,
    p.id_equipo_local AS id_equipo,
    m.puntos_local    AS gf,
    m.puntos_visitante AS gc,
    p.estado
  FROM partido p
  JOIN v_marcador_partido m ON m.id_partido = p.id_partido
  WHERE p.id_torneo = p_id_torneo
    AND (p_id_etapa IS NULL OR p.id_etapa = p_id_etapa)

  UNION ALL

  SELECT
    p.id_partido,
    p.id_equipo_visitante AS id_equipo,
    m.puntos_visitante AS gf,
    m.puntos_local     AS gc,
    p.estado
  FROM partido p
  JOIN v_marcador_partido m ON m.id_partido = p.id_partido
  WHERE p.id_torneo = p_id_torneo
    AND (p_id_etapa IS NULL OR p.id_etapa = p_id_etapa)
    AND p.id_equipo_visitante IS DISTINCT FROM p.id_equipo_local
)
```

El resto del `UPSERT` queda igual. Los `FILTER (WHERE estado = 'Finalizado')`
siguen protegiendo correctamente: un partido en curso no puntúa hasta que se
cierra.

**Punto de cuidado:** esta función es plpgsql y corre por `SELECT
actualizar_posiciones(?, ?)`. Como la vista ya filtra por estado, el JOIN
`partido ↔ v_marcador_partido` es 1:1 y no cambia la cardinalidad, así que el
`GROUP BY` y los `COALESCE` siguen siendo válidos sin ajustes.

---

## 6. Maquina de estados

### 6.1 Estado del partido (`partido.estado`)

```
                 ┌──────────────┐
                 │  Pendiente   │
                 │  Programado  │
                 └──────┬───────┘
                        │ iniciar
                        ▼
                 ┌──────────────┐   suspender    ┌──────────────┐
      ┌────────►│   En Juego   ├───────────────►│  Suspendido  │
      │         └──────┬───────┘◄───────────────┤              │
      │                │                       └──────┬───────┘
      │ reanudar       │ finalizar                     │
      │                ▼                                │
      │         ┌──────────────┐                         │
      └─────────┤  Finalizado  │◄────────────────────────┘
     (corregir) └──────────────┘   (desuspendir → En Juego)
                 ┌──────────────┐
                 │  Cancelado   │  (terminal, desde cualquier estado)
                 └──────────────┘
```

`En Juego ↔ Suspendido` es reversible: una suspensión por lluvia vuelve a
`En Juego`, y el reloj se reanuda desde donde estaba. El tiempo de pausa no
cuenta como tiempo de partido, que es exactamente para lo que existe
`reloj_acumulado_seg`.

**Transiciones que deben rechazarse:**

- Cualquier escritura de evento si `estado != 'En Juego'`.
- `Finalizado` es terminal, salvo el caso explícito de corrección que se pospuso.
- `Cancelado` es terminal.

### 6.2 Estado del reloj (`partido.reloj_estado`)

Independiente del estado del partido, y esa independencia es intencional: un
partido `En Juego` puede tener el reloj en `PAUSADO` (lesión, disputa) sin
cambiar el estado del partido.

```
PENDIENTE ──iniciar──► EN_CURSO ◄──reanudar── PAUSADO
                          │                        ▲
                          │────pausar──────────────┘
                          │
                          ▼
                      FINALIZADO   (al cerrar el partido)
```

`reloj_estado` nunca se pone en `FINALIZADO` por su cuenta: se deriva del
cierre del partido. Es una consecuencia, no una acción.

### 6.3 Estado del evento (`evento_partido.estado`)

Solo dos valores en v1: `CONFIRMADO` y `ANULADO`. Es **terminal**: un evento
anulado no vuelve a confirmarse. Si un árbitro se equivoca, la corrección es
anular el evento viejo y registrar uno nuevo, que es justo lo que quiere la
trazabilidad.

La eliminación física no existe: **no hay `DELETE` sobre `evento_partido`**. Si
se necesita corregir, se anula con motivo.

---

## 7. Cálculo del reloj

La parte que más conviene aislar y testear. Función pura, sin I/O:

```js
function segundosTranscurridos(reloj, ahoraMs) {
  const { reloj_estado: estado, reloj_iniciado_en: desde, reloj_acumulado_seg: acum } = reloj;
  if (estado !== 'EN_CURSO' || !desde) return acum;
  return acum + Math.floor((ahoraMs - new Date(desde).getTime()) / 1000);
}
```

**El servidor es la autoridad, y la fórmula se evalúa con hora de base de datos,
no de Node.** La diferencia importa: el backend puede tener skew contra la
base, y si el reloj se calculara con `Date.now()` en Node mientras `hora_real`
lo pone `CURRENT_TIMESTAMP` en Postgres, un partido Registraría goles con
timestamps de dos relojes distintos e inconsistentes entre sí.

Por eso el INSERT del evento hace el cálculo **en una sola sentencia SQL**:

```sql
WITH reloj AS (
  SELECT
    p.id_partido,
    CASE
      WHEN p.reloj_estado = 'EN_CURSO' AND p.reloj_iniciado_en IS NOT NULL
        THEN p.reloj_acumulado_seg
             + FLOOR(EXTRACT(EPOCH FROM (now() - p.reloj_iniciado_en)))::int
      ELSE p.reloj_acumulado_seg
    END AS segundos
  FROM partido p
  WHERE p.id_partido = ?
),
numero AS (
  SELECT COALESCE(MAX(numero_evento), 0) + 1 AS n
  FROM evento_partido
  WHERE id_partido = ?
)
INSERT INTO evento_partido (
  id_partido, numero_evento, tipo_evento, id_equipo, id_usuario_arbitro,
  registrado_por, segundos_partido, idempotency_key
)
SELECT ?, numero.n, 'ANOTACION', ?, ?, ?, reloj.segundos, ?
FROM reloj, numero
RETURNING *;
```

Una sentencia, un reloj, atómico. `hora_real` lo pone el `DEFAULT`.

**Concurrencia del `numero_evento`.** El `MAX(...) + 1` de arriba tiene una
condición de carrera clásica: dos árbitros registrando en paralelo leen el
mismo `MAX`. Se resuelve con `pg_advisory_xact_lock(id_partido)` al inicio de
la transacción, que serializa las escrituras sobre un mismo partido y libera
solo al hacer commit. Con el unique index `(id_partido, numero_evento)` como
red de seguridad: si algo se escapa, la transacción falla ruidosamente en vez
de duplicar números.

**Idempotencia del doble clic.** Un doble tap en "REGISTRAR" no debe crear dos
goles. El frontend genera un `idempotency_key` por intento (UUID) y lo manda
en el body; el unique index parcial lo absorbe: si la clave ya existe, el
servidor devuelve el evento ya creado con `200` en vez de insertar otro. Es
más robusto que un debounce en el cliente, que no protege de un retry de red.

---

## 8. API

Montada bajo el recurso existente, reusando las convenciones del proyecto
(`formatResponse`, `soloCampos`, `_context(req)`, `bitacoraService.log`).

### `GET /api/matches/:id/live`

**Una sola llamada que devuelve todo lo que la pantalla necesita.** Es lo que
hace que la vista sea "en vivo" sin casts raros: la pantalla no arma su estado
con 4 llamadas encadenadas.

```json
{
  "partido": { "id_partido": 125, "estado": "En Juego", "cancha": "...", "torneo": "..." },
  "equipos": { "local": {...}, "visitante": {...} },
  "arbitros": [{ "id": 32, "nombre": "Juan Rodríguez", "rol": "PRINCIPAL" }],
  "marcador": { "local": 2, "visitante": 1 },
  "reloj": { "estado": "EN_CURSO", "segundos": 993, "iniciado_en": "...", "acumulado": 0 },
  "server_time": "2026-09-29T13:23:07.412Z"
}
```

`server_time` se manda para que el cliente detecte su propio drift contra el
reloj del servidor y no muestre un tiempo de partido 3 segundos adelantado.

### `POST /api/matches/:id/events`

```json
{ "id_equipo": 8, "id_usuario_arbitro": 32, "idempotency_key": "uuid" }
```

No acepta `hora_real`, ni `segundos_partido`, ni `estado`: los tres los pone el
servidor. Rechaza con `409` si el partido no está `En Juego`, o si el equipo no
es uno de los dos que participan (esa última verificación no la puede hacer una
FK, porque `id_equipo` en `evento_partido` apunta a `equipo`, no a "uno de los
dos de este partido"; es un `CHECK` de negocio en el servicio).

### `PATCH /api/matches/:id/events/:idEvento/anular`

```json
{ "motivo_anulacion": "Error de carga" }
```

El motivo es **obligatorio**. La anulación escribe `estado = 'ANULADO'`,
`anulado_por`, `anulado_en` y el motivo. El marcador se recalcula solo por ser
el resultado de un `COUNT` sobre eventos `CONFIRMADO`.

### `GET /api/matches/:id/events`

Historial paginado, con los nombres resueltos (equipo, árbitro) para que el
frontend no tenga que hacer N+1.

### `POST /api/matches/:id/clock`

```json
{ "accion": "INICIAR" | "PAUSAR" | "REANUDAR" }
```

Una sola ruta para las tres transiciones, porque las tres son la misma operación
sobre las mismas columnas con guards distintos. Un endpoint por acción sería
tres archivos con la misma validación.

**`PAUSAR` es la operación que necesita el `UPDATE` correcto:**

```sql
UPDATE partido
SET reloj_acumulado_seg = reloj_acumulado_seg
                        + FLOOR(EXTRACT(EPOCH FROM (now() - reloj_iniciado_en)))::int,
    reloj_iniciado_en   = NULL,
    reloj_estado        = 'PAUSADO'
WHERE id_partido = ?
  AND reloj_estado = 'EN_CURSO';
```

Acumular en el momento de la pausa y no dejar el cálculo para la reanudación:
así, si la base se reinicia o el proceso de Node se cae, el tiempo no se pierde.
`REANUDAR` es el inverso trivial y `INICIAR` solo pone `reloj_iniciado_en =
now()`.

---

## 9. Autorización

Se reusa el modelo que ya está armado, sin inventar uno paralelo:

- **Escritura de eventos:** `_assertArbitroAsignado(idPartido, userId, rol)`,
  ya escrito en `partido.service.js:22`. Solo los árbitros asignados y el
  Administrador pasan.
- **Lectura:** `alcanceService.filtrarPorEquipos(query, alcance, [...])` con
  `req.alcance`. Ojo con la invariante 3 de `alcance.service.js`: si el
  alcance no viene resuelto, la función **lanza** en vez de filtrar de menos.
  Un endpoint nuevo que se olvide de pasarlo falla ruidosamente, que es
  exactamente el comportamiento buscado, pero hay que acordarse de pasarlo.
- **`estado`, `rol`, `hora_real`, `segundos_partido` y `resultado_cargado`**
  entran en la lista de `bloquear` del `crud()` de `partido`, igual que
  `resultado_cargado` está bloqueado hoy. Sin esto, un `PUT /matches/:id` con
  `{ "estado": "Finalizado" }` saltaría la máquina de estados.

Las acciones de reloj y de cierre de partido pasan por `operarPartido`, como el
`PATCH /:id/status` actual. Ese guard acepta a SuperAdmin y Administrador sin
mirar el staff, y al Arbitro solo si figura asignado a ese partido.

---

## 10. Frontend

Página nueva `MatchLivePage`, separada de la administración del partido,
que es la decisión de diseño que más va a condicionar el futuro: tarjetas, cambios,
sanciones, tiempos muertos y sets se agregan como filas más de la planilla sin
rediseñar nada.

**Estructura de la pantalla, de arriba abajo:** cabecera con el estado y el
tiempo de partido, el marcador grande, el formulario de registro, y la tabla
de historial.

El formulario de registro tiene **un solo campo real**: el equipo. El árbitro
se preselecciona (es quien está operando, o el principal si hay varios) y el
número de punto **no se escribe: se muestra** como consecuencia del registro
anterior. La pantalla no debería permitir escribir nada que el servidor ya sabe
calcular.

La confirmación es un modal de revisión, no un campo: se muestra lo que se va a
persistir y se pide un OK. Es barato y evita el click accidental — que es el
problema concreto que motiva la pantalla de confirmación en el diseño original.

El reloj del cliente **no se consulta al servidor cada segundo.** El valor de
`segundos` que llega en la respuesta se cuenta hacia adelante localmente desde
el instante en que llegó, y cada 15 segundos hay una recarga en segundo plano
que lo re-sincroniza (además de recargar el marcador y el historial, por si
otro árbitro del partido registró algo).

Consultar cada segundo es tráfico a cambio de nada: la única fuente de verdad
del tiempo de partido es el servidor en el momento de cada evento, y eso ya
quedó resuelto con el INSERT en una sola sentencia. Y el valor que llegaría
tarde tampoco ayudaría, porque entre una respuesta y la siguiente el número
correcto ya cambió.

Un detalle sobre el desfase de reloj: `server_time` **no** se usa para contar
la duración, sino solo para *mostrar* marcas absolutas como `hora_real`. La
diferencia entre dos instantes no depende de qué reloj se use, así que el
`offset` es irrelevante para el tic; sí importa para que un navegador dos
minutos desviado no muestre el gol de las 20:10 como si fuera de las 20:12.

`MisPartidosPage` deja de mostrar el modal "Cargar Resultado": con el marcador
derivado, escribir los números a mano es exactamente la fuente de error que
este módulo elimina. El botón pasa a ser "Abrir en vivo", que navega a
`match-live/:id`.

---

## 11. Pruebas

El módulo tiene tres partes con perfiles de riesgo distintos:

**Función pura del reloj** — tabla de casos, sin mocks: `EN_CURSO` sin pausa,
`EN_CURSO` con acumulado, `PAUSADO`, `PENDIENTE`, `FINALIZADO`, transición en
el segundo exacto. Es la parte donde un error produce datos incorrectos de
forma silenciosa, y por eso va primero y con cobertura total de ramas.

**Servicio** — los caminos de error, siguiendo el patrón de
`tests/unit/partido.service.test.js` (que aísla repositorios con `jest.mock` y
falsea el driver de knex): rechazar evento con partido no `En Juego`, con
equipo ajeno al partido, con árbitro no asignado; `PAUSAR` dos veces;
`FINALIZAR` sin resultado cargado; anular un evento ya anulado; la
idempotencia del doble clic.

**Concurrencia** — dos registros simultáneos sobre el mismo partido deben
producir `numero_evento` 1 y 2, no dos eventos con número 1. Este caso
justifica el advisory lock y, si no lo cubre, el advisory lock es código
muerto que nadie va a notar que falta.

**Regresión de posiciones** — un torneo con partidos finalizados debe producir
exactamente las mismas posiciones antes y después de la migración. Este test es
el que detecta un backfill mal hecho, y es la razón por la que el backfill va
en su propia migración.

---

## 12. Orden de implementación

1. Migración de `staff_partido.rol` y columnas de reloj en `partido`. Sin
   dependencias, reversible sola.
2. Migración de `evento_partido` + índices. Todavía sin usar.
3. Migración de backfill, **verificada con el conteo** antes de seguir.
4. Vista `v_marcador_partido`.
5. `actualizar_posiciones` reescrita sobre la vista.
6. Repositorio, servicio, controlador y rutas del ledger y el reloj.
7. Rutas de lectura para la vista en vivo.
8. `PATCH /:id/result` deja de aceptar valores.
9. Frontend: página en vivo, reloj local, reemplazo del modal de resultado.
10. Tests de regresión de posiciones sobre la migración.

Los pasos 1-5 son el cambio de schema, que es lo que se puede revertir con un
`migrate:rollback`. El paso 6 en adelante ya es código de aplicación.

### 12.1 Estado: implementado y verificado

Los diez pasos están aplicados y probados, y migrados tanto en `jebo_2026` como
en `jebo_2026_test`. Evidencia:

| Comprobación | Resultado |
| --- | --- |
| `npx jest` (backend) | 439 tests / 23 suites |
| `npx vitest run` (frontend) | 311 tests / 12 archivos |
| `scripts/verificar-carga-partido.js` | 21/21 checks OK contra la base real (incluye admin y arbitro ajeno) |
| `scripts/verificar-concurrencia-partido.js` | 5 registros en paralelo → `numero_evento` 1..5 correlativo |
| `vite build` | compila |
| Regresión de posiciones (torneos 19/28/29/30) | salida byte-idéntica a la línea base |

**Desviaciones respecto del plan original**, y por qué:

- **No hay override administrativo.** El plan ya lo excluía (D1) y así quedó:
  el resultado se congela con `cerrarResultado`, que lee el marcador derivado y
  escribe `goles_local`/`goles_visitante` una única vez. Lo que sí se
  eliminó del `PATCH /:id/result` son los goles del body, y `crud()` ahora los
  rechaza igual que `resultado_cargado`.
- **El primer árbitro de la lista es `PRINCIPAL`.** No se fuerza "exactamente un
  principal" (ver §4.3), así que la UI resuelve el rol al hacer el alta.
- **La pantalla en vivo incluye el cierre del resultado.** Se evaluó dejarlo
  todo en la pantalla de partidos, pero "cerrar el resultado" es el final
  natural del flujo del ledger y sigue la misma regla: no se escribe ningún
  número. *Finalizar* el partido sí quedó en la pantalla de partidos, que es
  donde vive la administración.

**Seis partidos quedaron sin árbitro** (73, 92, 94, 97, 98, 99) y por lo tanto
con eventos de backfill sin árbitro. Ver §4.1. La migración lo avisa por
`console.warn`. El partido 73 es `Finalizado` 3-5 en el torneo 19 y **sí** afecta
las posiciones, así que la inconsistencia de `posicion` en ese torneo es
preexistente y no la introdujo este trabajo.


---

## 13. Riesgos y puntos abiertos

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Backfill mal ejecutado | Posiciones históricas corruptas | Migración propia, conteo verificado, test de regresión |
| Doble registro por doble clic | Gol fantasma | `idempotency_key` + unique index, no debounce de cliente |
| Carrera en `numero_evento` | Números duplicados | `pg_advisory_xact_lock` + unique index |
| Skew entre Node y Postgres | Tiempos inconsistentes | Todo el cálculo del reloj en SQL, con hora de la base |
| Dos representaciones del marcador durante la transición | Desincronización | `goles_local`/`goles_visitante` bloqueadas en `crud()`; única escritura en el cierre, en la misma transacción |
| Arbitro escribe el partido equivocado | Evento en el partido incorrecto | El ID del evento va en la URL y el servicio valida pertenencia |

**Decisiones pendientes.** Ninguna bloquea el código que ya está en pie, pero
conviene resolverlas antes de que aparezcan los casos:

1. **¿Puede un árbitro anular el evento de otro árbitro? — SIN RESOLVER, y el
   comportamiento actual es la respuesta por omisión.** `eventoService.anular`
   exige `_assertArbitatigoAsignado` y nada más: cualquier árbitro del partido
   puede anular cualquier evento, y también un Administrador. La propuesta de
   abajo (solo el propio, dentro de un plazo) **no se implementó**. Se dejó así
   a propósito, porque en la práctica el caso real es el de un solo árbitro
   corrigiendo su propia carga, y una restricción mal puesta estorba más de lo
   que protege. Pero es una decisión consciente, no un olvido: si en un torneo
   hay dos árbitros y no se puede confiar en que uno no toque lo del otro, hace
   falta escribir la regla explícitamente.

   Lo que sí es inviolable, y está cubierto por test: la anulación **nunca**
   borra. El evento queda con `estado = 'ANULADO'`, `motivo_anulacion`,
   `anulado_por` y `anulado_en`.

2. **¿Se corrige un partido ya `Finalizado`? — SIN RESOLVER.** `Finalizado` es
   terminal y el ledger queda congelado. Si un torneo ya terminó, no hay vuelta
   atrás. Si la respuesta es "sí, con autorización", hace falta un camino
   distinto al de la anulación ordinaria, no un parche sobre `anular()`.

3. **Períodos y `SET` para Voleibol.** `tipo_evento` ya lo admite, pero un set
   tiene marcador propio (`18-17`) y duración propia, lo que implica una tabla
   de períodos. Fuera del alcance de v1; conviene dejarlo escrito antes de que
   alguien intente meterlo en `evento_partido` a la fuerza. **Ojo:** la palabra
   "Punto" en la pantalla en vivo es solo una etiqueta de presentación
   (ver `nombreAnotacion` en `MatchLivePage.js`); el tipo almacenado sigue
   siendo `ANOTACION`, así que agregar `SET` después no requiere migración de
   lo que ya se escribió.

4. **Qué pasa con los partidos `Finalizado` cuando se anula un evento.** Hoy
   `Finalizado` es terminal, así que no se llega. Pero si se permite corregir
   (punto 2), hay que decidir si `actualizar_posiciones` se recalcula al anular
   o si el torneo queda "cerrado" al finalizar la última etapa.

5. **Los seis partidos sin árbitro (§4.1).** El backfill los dejó con `NULL` a
   propósito. Falta decidir si se les asigna un árbitro histórico para poder
   atribuir sus eventos, o si se acepta el hueco. **No se debe rellenar con un
   usuario inventado.**

