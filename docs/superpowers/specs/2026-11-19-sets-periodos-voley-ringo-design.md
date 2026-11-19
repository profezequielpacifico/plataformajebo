# Sets y períodos para Vóley y Ringo

19 de noviembre de 2026

## Por qué

Vóley (sets) y Ringo (períodos) se juegan al mejor de 3. Hoy el sistema lleva un único contador por partido: los árbitros terminaron cargando sets o períodos ganados como si fueran puntos ("1 - 2"). Eso deja sin datos a las reglas de desempate de esas disciplinas (sets a favor/en contra, puntos a favor/en contra, diferencia de períodos y de puntos) y hace fácil cargar mal un partido.

El objetivo es que la pantalla del árbitro separe el partido en sets/períodos, que cada uno se cierre con confirmación, y que el sistema guarde por separado los sets ganados y los puntos de cada set.

## Reglas del juego (dadas por el usuario)

Iguales para Vóley y Ringo; solo cambia el nombre ("Set" / "Período").

- Al mejor de 3.
- Sin límite de tiempo ni de puntos: el set/período lo termina el árbitro.
- Cerrar cada set/período es obligatorio. El partido no se puede cerrar con un set abierto.
- Cerrar un set pide confirmación.
- Si un equipo ganó los dos primeros sets, el árbitro **puede** terminar el partido (2–0) o jugar el tercero; es opcional. Terminar antes pide **doble confirmación**.
- Si se juega el tercer set con 2–0, **cuenta**: el resultado puede quedar 3–0 o 2–1 y sus puntos suman.
- Si quedan 1–1 se juega el tercero.
- El reloj es opcional en estas dos disciplinas.

## Objetivos

- Pantalla "Partido en vivo" con marcador de sets y marcador del set en juego.
- Puntos registrados por set, con el mismo ledger de eventos que hoy (cada toque suma uno, anulables).
- Resultado oficial del partido = sets ganados. Tablas de posiciones, "a favor" y "en contra" en sets.
- Puntos de cada set guardados y consultables para los desempates.

## No objetivos

- Cambiar los criterios de desempate (`tabla-instancia.js`, `criterios_desempate`). Es el paso siguiente y usará estos datos.
- Cambiar las demás disciplinas: fútbol, handball, básquet y softbol siguen exactamente igual.
- Reescribir los 100 partidos ya finalizados de vóley y ringo.

## Anti-objetivos

- Que el árbitro escriba marcadores a mano.
- Que un set pueda quedar abierto o cerrarse sin confirmación.
- Que cambie un solo número en las tablas actuales de vóley y ringo por esta migración.

## Approaches

- **A. Sets como dato propio (elegida).** Tabla de sets por partido y número de set en cada evento. Resultado = sets ganados. Deja cada cierre como un hecho explícito y los datos limpios para desempates.
- **B. Marcas "fin de set" en el ledger.** Migración mínima, pero cada cálculo reconstruye los sets leyendo el historial y anular un fin de set es confuso.
- **C. Carga manual de sets al final.** Rompe la regla de "el marcador no se escribe a mano" y pierde la confirmación set por set.

El usuario eligió A.

## Diseño

### Qué disciplinas usan sets

Columnas nuevas en `disciplina`:

- `marcador_por_periodos boolean not null default false`
- `nombre_periodo varchar(20)` ("Set" / "Período")
- `max_periodos smallint` (3)

Los ids de disciplina no coinciden entre entornos (producción: 4 "Voley Jebo 2026", 6 "Ringo Jebo 2026"; la base local tiene "Mini Vóley" 17 y "Ringosport" 11). *Decisión del constructor:* la migración activa el modo por nombre normalizado (sin tildes, minúsculas) que contenga `voley`, `voleibol` o `ringo`; `nombre_periodo` = "Set" para vóley y "Período" para ringo. Además el formulario de disciplina muestra las tres columnas para poder activarlo o corregirlo a mano. El frontend deja de adivinar por el nombre (`nombreAnotacion`) para estas dos y usa las columnas, que vienen en `findLive`.

### Datos

Tabla nueva `partido_periodo`:

| columna | tipo |
| --- | --- |
| id_partido_periodo | serial pk |
| id_partido | fk partido, on delete cascade |
| numero | smallint (1..max_periodos) |
| estado | 'EN_JUEGO' / 'CERRADO' |
| puntos_local, puntos_visitante | int, se congelan al cerrar |
| id_equipo_ganador | fk equipo, al cerrar |
| cerrado_por | fk usuario |
| cerrado_en | timestamp |

`unique (id_partido, numero)` y un índice parcial que asegura un solo `EN_JUEGO` por partido.

Columna nueva `evento_partido.numero_periodo smallint null`: el set en que se registró. Nula para todas las demás disciplinas y para los eventos viejos.

### Marcador

`v_marcador_partido` sigue siendo la única fuente del marcador (la usan las tablas de posiciones, `v_posicion_instancia`, el listado de partidos y `cerrarResultado`):

- Partido **con** filas en `partido_periodo`: `puntos_local` / `puntos_visitante` = cantidad de sets **cerrados** ganados por cada uno.
- Partido **sin** filas: igual que hoy (conteo de anotaciones). Así los 100 partidos viejos de vóley y ringo y todas las demás disciplinas no cambian.

Vista nueva `v_puntos_periodo_partido` (por partido: suma de puntos local/visitante de sus sets cerrados) para los desempates futuros.

### Flujo en el backend

- Al pasar el partido a "En Juego" en una disciplina por períodos, se crea el set 1 `EN_JUEGO` si no existe **y el partido todavía no tiene eventos**.
- *Decisión del constructor (partidos en curso al desplegar):* un partido es "por sets" si tiene filas en `partido_periodo`. Un partido de vóley o ringo que ya tenga eventos sin sets sigue con el contador plano de hoy hasta terminar (pantalla y backend vieja usanza). En producción hoy no hay ninguno: los 100 de vóley y ringo están Finalizados.
- `POST /matches/:id/events`: si el partido va por sets, exige un set `EN_JUEGO` y graba su número en el evento.
- `POST /matches/:id/periods/close` (operarPartido): cierra el set en juego. Rechaza si está empatado. Congela puntos y ganador. Después:
  - si el partido quedó 1–1 → abre el set 3;
  - si quedó 2–0 → no abre nada; el árbitro elige;
  - si ya se jugaron 3 → no abre nada.
  Body con `numero` del set que se cree cerrar: si no coincide con el set en juego responde 409 (evita doble cierre por doble toque o dos árbitros).
- `POST /matches/:id/periods/open` (operarPartido): abre el set 3 solo cuando va 2–0 y no se jugó.
- Anular un evento de un set cerrado: rechazado (el set está congelado).
- `PATCH /matches/:id/result` (cerrar resultado): en partidos por sets exige que no haya set `EN_JUEGO` y que haya un ganador (2 sets ganados), y **no** exige que el reloj haya arrancado. Las demás disciplinas, igual que hoy.
- *Decisión del constructor:* en partidos por sets, cerrar el resultado es definitivo: después se rechazan nuevos eventos, anulaciones, `/periods/open` y `/periods/close` (409). Así el marcador de la vista nunca se separa de `goles_local/goles_visitante`. "Terminar partido 2–0" no guarda un estado intermedio: tras la doble confirmación llama directamente al cierre de resultado.
- Finalizar el partido sigue igual que hoy (requiere resultado cerrado).
- `GET /matches/:id/live` agrega `periodos: { nombre, max, lista: [{numero, estado, puntos_local, puntos_visitante, id_equipo_ganador}] }` y el marcador del set en juego.
- Bitácora: `CERRAR_PERIODO_PARTIDO`, `ABRIR_PERIODO_PARTIDO`.

### Pantalla del árbitro (`MatchLivePage`)

Solo cambia para disciplinas por períodos:

```
 Sets:   Región 1  1 – 0  Región 4
 Set 1: 25–20 ✔   Set 2: en juego

 SET 2        Región 1  12 – 9  Región 4
 [ + Punto Región 1 ]  [ + Punto Región 4 ]

 [ Terminar set 2 ]
```

- Marcador grande = sets; debajo, el set en juego con sus puntos; una fila con el resultado de cada set cerrado.
- "Terminar set N": modal de confirmación ("¿Terminar el set 2 con 12–9? Lo gana Región 1. No se puede deshacer."). Deshabilitado si está empatado, con el motivo a la vista.
- Con 2–0 y sin set 3: dos botones, "Jugar set 3" y "Terminar partido 2–0". Terminar pide doble confirmación (dos modales seguidos) y cierra el resultado.
- Con 2–1 o 3–0: "Cerrar partido X–Y" con una confirmación; usa el cierre de resultado actual.
- Con el resultado cerrado: la pantalla queda de solo lectura y recuerda que falta finalizar desde Partidos, como hoy.
- El reloj se sigue mostrando pero no bloquea nada.
- El historial de eventos agrega la columna "Set".

## Lo que queda para quien lo construya

- Nombres exactos de endpoints, componentes y mensajes, siguiendo los que ya hay.
- Tests: backend (servicio y repositorio de períodos, vista de marcador con y sin períodos, que las tablas de las demás disciplinas no cambian) y frontend (`MatchLivePage` en modo sets).
- Mostrar sets en el detalle del partido y listados, si ayuda, sin cambiar el formato "X - Y".
