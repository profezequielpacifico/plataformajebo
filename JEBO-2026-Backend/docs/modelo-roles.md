# Modelo de roles y permisos — JEBO 2026

> **Estado: aprobado, en implementación por fases.**
> Las decisiones de las secciones 1 y 2 están tomadas. Lo único aplicado al
> escribir este documento es la Fase 0 (esta documentación). La Fase 1 —los
> guards, el rol `SuperAdmin` y el alcance por recurso— todavía no existe en el
> código: hasta que exista, el árbol de abajo es el destino, no el estado.
>
> Este documento reemplaza la propuesta anterior de "tres capas y multi-rol".
> Esa propuesta quedó descartada por dos decisiones: no hay rol `Invitado`, y
> `partido` y `presentacion` **no** se unifican en un solo verbo.

---

## 1. Decisiones registradas

| # | Decisión | Consecuencia técnica |
|---|---|---|
| 1 | **Árbitro conserva la operación del partido**: reloj, eventos, comenzar, finalizar, cerrar resultado | Los mismos 6 endpoints, ahora con `operarPartido`: el Árbitro entra solo si está asignado a ese partido |
| 2 | **Juez no interviene en `partido`**. Solo en `presentacion` | Quedan dos unidades operativas con un responsable cada una |
| 3 | **Visibilidad pública por reglas de negocio**, sin columna `publicado` | Endpoints `/api/public/*` separados, que nunca reutilizan los administrativos |
| 4 | **Invitado no es un rol** | No hay fila en `rol` ni constante `INVITADO` |

### 1.1 Lo que el Árbitro puede y no puede

Puede, **solo sobre partidos donde está asignado**:

- ⏱️ manejar el reloj
- ⚽ registrar eventos (goles/puntos)
- ▶️ comenzar
- ⏹️ finalizar
- ❌ cancelar
- 🔒 cerrar el resultado

No puede:

- crear ni eliminar partidos
- asignar árbitros o jueces
- administrar torneos, equipos ni inscripciones
- administrar usuarios ni direcciones IP
- evaluar presentaciones
- modificar la configuración de una disciplina

> La asimetría es deliberada: **el Admin crea y configura el partido; el Árbitro lo opera.**

### 1.2 Las dos unidades operativas

```
PARTIDO                              PRESENTACIÓN
   │                                     │
   ├── Árbitro                           ├── Juez
   │     ├── comenzar                    │     ├── comenzar
   │     ├── reloj                       │     ├── cargar evaluación
   │     ├── eventos                     │     ├── modificar evaluación
   │     ├── finalizar                   │     └── finalizar
   │     ├── cancelar                    │
   │     └── cerrar resultado            │
   │                                     │
   └── NO participa el Juez             └── NO participa el Árbitro
```

No se intenta hacer que los dos roles sean equivalentes. Cada unidad tiene su
responsable y su vocabulario. Agregar Gimnasia Artística, o cualquier otra
disciplina de evaluación, no obliga a inventar otro sistema de permisos.

### 1.3 Decisiones derivadas, ya confirmadas

**a) El valor en base de `Profesor` no cambia.** "Entrenador" es nombre de
presentación en la UI. Renombrar el valor persistido rompería
`GET /users?rol=Profesor` (lo usan `TeamFormPage` y `MatchFormPage`),
`alcance.service.js` y `rolExisteValidator`, sin ganar nada.

```
BD / API:  Profesor
UI:        Profesor / Entrenador
```

**b) Geografía a SuperAdmin; estructura competitiva a Admin.**

```
SUPERADMIN                ADMIN + SUPERADMIN
└── Geografía              ├── Deportes        ├── Equipos
    ├── Regiones           ├── Instituciones   ├── Torneos
    ├── Distritos          ├── Canchas         ├── Partidos
    └── Localidades        ├── Etapas          └── Presentaciones
                           └── Instancias
```

Un Admin puede **leer** toda la geografía —los GET son `authenticate`— pero no
modificarla. No necesita alterar la estructura territorial para administrar una
competencia.

**c) Los guards no son todos "más de X".** Ver §5.

**d) Cambiar de rol invalida la sesión.** Si SuperAdmin le baja el rol a un Admin,
el JWT anterior sigue siendo válido hasta **1 hora** (el access vive 1 h) y el
usuario conserva las capacidades anteriores. Se bumpea `token_version` cuando
cambia `id_rol`, reutilizando `tokenRevocacionService`. Sin esto, "cambiar roles"
sería una función insegura.

**e) Los 5 permisos de Profesor no son 5 endpoints nuevos.** Son 5 endpoints que
ya están dentro de los 70 y que admiten un alcance adicional. Por eso el
conteo sigue siendo 70 y no 75: contarlos dos veces sería Contestar
equivocadamente la pregunta.

---

## 2. El modelo

```
                    JEBO 2026
                        │
             ┌──────────┴──────────┐
             │                     │
       AUTENTICADOS             INVITADO
             │                     │
     ┌───────┼────────┐            │
     │       │        │            │
SuperAdmin Admin   Operativos    /api/public/*
                  │
             ┌────┴─────┐
             │          │
          Árbitro      Juez
             │          │
          PARTIDO   PRESENTACIÓN
             │          │
          operación   evaluación
             │          │
             └────┬─────┘
                  │
          Profesor / Entrenador
                  │
              SU EQUIPO
```

| Perfil | Qué administra | Alcance |
|---|---|---|
| **SuperAdmin** | Sistema + competencia + usuarios + seguridad | Global, sin limitación |
| **Admin** | La competencia completa | Global sobre la competencia |
| **Árbitro** | Operación del partido en vivo | Solo partidos asignados |
| **Juez** | Presentaciones y evaluaciones | Solo presentaciones donde está en el jurado |
| **Profesor / Entrenador** | Equipos e inscripciones | Solo los equipos que administra |
| **Invitado** | Nada | Solo información pública |

`Invitado` no aparece como fila de rol: es el estado de quien no está
autenticado.

---

## 3. El problema que lo motiva, medido

El dolor de hoy no es "faltan roles": es que **el rol significa tres cosas
distintas según el archivo donde se lee**, y esas tres se mezclan.

> Las secciones de §3 y §4 describen **el estado antes de F1**. Se dejan como
> están porque son la línea de base: un hallazgo sin el número con el que se midió
> no sirve para comprobar después que se cerró. Cada una dice al final si sigue
> abierto o qué fase lo cerró.

### 3.1 Hay un rol fantasma

`src/constants/roles.js` declaraba cinco roles:

```js
const ROLES = {
  ADMIN: 'Administrador',
  EDITOR: 'Editor',      // <-- no existe en la base
  PROFESOR: 'Profesor',
  ARBITRO: 'Arbitro',
  JUEZ: 'Juez'
};
```

`Editor` fue borrado de la tabla `rol` por la migración
`20260907115000_eliminar_roles_extra.js`, pero `requireEditorOrAbove` seguía
protegiendo **23 endpoints**. Como el alta de usuarios valida el rol contra la
tabla, `Editor` no se puede crear: esos 23 endpoints eran, en la práctica,
`requireAdmin`. El nombre mentía.

Es el mismo patrón que en septiembre hizo que `Juez` no se pudiera asignar.

**Cerrado en F1.4.** `EDITOR` sale de `ROLES`, `requireEditorOrAbove` y
`requireAdmin` se funden en `requireAdminOrAbove`, y las 23 rutas que usaban el
nombre viejo usan el nuevo. De los 23, cuatro pasaron además a ser del Profesor
dueño del equipo, que es el único punto donde F1.4 abrió algo en vez de cerrarlo.

### 3.2 El nombre del rol está en cuatro lugares, y el id mágico en cinco archivos más

| Dónde | Qué hay |
|---|---|
| `src/constants/roles.js` | la lista "oficial" del backend |
| `src/services/*` | comparaciones literales: `context.rol === 'Administrador'`, `'Profesor'` como default |
| `src/config/constants.js` (front) | `USER_ROLES` con 4 roles, otra copia |
| `pages/**/*.js` (front) | `user.rol === 'Administrador'` literal en 7 páginas |
| `layouts/MainLayout.js` + páginas | **`user.id_rol === 1` y `user.id_rol === 10`** |

`id_rol === 1` aparece en `MainLayout`, `MatchLivePage`, `MisPartidosPage`,
`GymPresentationsPage` y `GymScoringPage`; `id_rol === 10` en `MainLayout`.
Ninguno de esos números está garantizado: dependen del orden en que la
secuencia `rol_id_rol_seq` fue asignando ids, y cambiaron con
`eliminar_roles_extra` y `add_rol_arbitro`.

El criterio de admin además está escrito de dos formas distintas:
`rol === 'Administrador' || id_rol === 1` en unas páginas, y solo
`rol === 'Administrador'` en `MatchDetailPage` y `LockedIpsPage`. Un admin con
el `rol` ausente pierde el botón de cancelar partido y toda la pantalla de IPs.

### 3.3 El frontend no acompaña al backend

De 41 páginas, **ninguna consulta el rol para habilitar o deshabilitar acciones**
salvo cuatro que lo hacen a medias. El menú solo se recorta para el Árbitro: un
**Juez ve "Usuarios", "Actividad" y "Opciones Avanzadas"** en el sidebar, entra, y
recibe 403.

### 3.4 La autenticación del logout no existe

`authService.logout()` tiene el `try` vacío: solo borra `localStorage`. El
`jti` del refresh token nunca se revoca en el servidor, así que la sesión cerrada
desde el cliente sigue viva del lado del backend hasta que expira.

---

## 4. Lo que YA está bien y hay que conservar

Esta parte del diseño es sólida y **no se toca**:

| Pieza | Por qué está bien |
|---|---|
| `alcance.service.js` (X-05) | El alcance se resuelve **dentro de `authenticate`**, y los repositorios de lectura **lanzan excepción** si no lo reciben. Un endpoint nuevo que se olvide del filtro falla ruidosamente en vez de filtrar de más. Sin instituciones ⇒ `whereIn` sobre `[]` ⇒ **cero** filas, no todas |
| Ledger de eventos | El marcador **nunca se escribe**: se deriva. Cada evento lleva `idempotency_key`, así que un doble click no duplica el gol |
| Reloj derivado | El tiempo nunca se guarda como contador: sale de `reloj_acumulado_seg` + tiempo desde `reloj_iniciado_en`. Por eso solo `PAUSADO` necesita acumular |
| Eventos terminales | Anular ≠ borrar, el motivo es obligatorio, y un evento anulado no vuelve a confirmarse |
| `staff_partido.rol` / `staff_presentacion.rol` | Son exactamente "el rol que tenés **dentro de este encuentro**". Ya están en el modelo, con CHECK. **No se inventan nada: se promueven a común** |
| `partido.service._assertArbitroAsignado` | Ya exige "estar asignado a este partido como árbitro" para poder operarlo (`partido.service.js:23`, invocado en 302 y 378) |
| `disciplina.tipo_competencia` | Separa MARCADOR de EVALUACION en un solo lugar |
| X-16 en `usuario.repository` | `email` y `documento` (que es un DNI) se recortan **en SQL**, no en JavaScript, y solo salen completos con alcance global o para el propio usuario |

---

## 5. Los guards nuevos

No todos los permisos son "más de X". Algunos necesitan **rol + fila + estado +
asignación**, y por eso no se resuelven con `requireRole`:

| Guard | Qué exige | Dónde |
|---|---|---|
| `requireSuperAdmin` | Rol `SuperAdmin` | Sistema, usuarios, geografía, seguridad, auditoría |
| `requireAdminOrAbove` | `SuperAdmin` o `Admin` | Toda la competencia |
| `operarPartido` | `SuperAdmin`/`Admin`, **o** Árbitro **asignado a ese partido** | Reloj, eventos, estado, resultado |
| `gestionarPresentacion` | `SuperAdmin` o `Admin` | Ciclo de vida de la presentación |
| `evaluarPresentacion` | `SuperAdmin`/`Admin`, **o** Juez **en el jurado de esa presentación** **y** en estado evaluable | Hoja de evaluación |
| `gestionarEquipoPropio` | `SuperAdmin`/`Admin`, **o** Profesor **dueño del equipo** — en el alta, Profesor que **lo va a crear** | Equipos e inscripciones |

La regla que los gobierna a todos:

```
rol  +  recurso  +  alcance  +  estado  +  asignación
```

Y la versión explícita para el Juez, que es la que hay que leer siempre:

```
Juez
 ↓
¿Está en el jurado de ESTA presentación?   ← no en el request
 ↓
¿La presentación está EN_CURSO?
 ↓
¿La operación es una escritura de evaluación?
 ↓
Sí → ejecutar
```

**Implementación (F1.3 las decisiones, F1.4 las conecta a las rutas).** La
decisión vive en `src/services/autorizacion.service.js` (una función por guard) y
los adaptadores HTTP en `src/middleware/autorizacion.js`. La misma función la
llama el guard de la ruta y el servicio que ejecuta la operación: no hay dos
copias de la regla. `operarPartido` generaliza
`partido.service._assertArbitroAsignado`. `gestionarPresentacion` es solo
`SuperAdmin`/`Admin` (no se le inventan permisos al Juez: su lugar es
`evaluarPresentacion`). En un endpoint de colección (sin `:id`, como
`/matches/mios`, `GET /presentaciones` o `POST /teams/enroll-batch`) el guard
solo filtra por nivel; el recorte por fila lo hace el servicio.

**El permiso depende de la propiedad del recurso, no de que exista `:id`.**
`POST /teams/enroll-batch` no tiene `:id` y sin embargo la pregunta es la misma:
¿de quién son los equipos del lote? Por eso el guard solo baja el nivel y la
propiedad se resuelve entera, en `autorizacion.service.assertGestionarEquiposPropiosBatch`,
**antes** de cualquier validación de negocio y **todo o nada**: si un solo equipo
del lote no es del Profesor, la respuesta es 403 y no se escribe ninguna fila de
`posicion`. Filtrar en silencio sería indistinguible de un bug — el profesor cree
que inscribió cinco equipos y hay tres — y validar el negocio antes del permiso
le diría si ese equipo ajeno ya está inscripto en el torneo. Las altas del lote
van en transacción, para que un fallo a mitad de camino no deje un lote a medias.

**El alta de equipo usa `gestionarEquipoPropio` y las reglas viven en
`equipo.service.create`.** En el alta (sin `:id`) el nivel alcanza porque la
fila todavia no existe: no hay propiedad que chequear. El riesgo que antes
dejaba la puerta cerrada —un Profesor eligiendo una institucion de la nada y
autoasignandose el tenant equivocado (X-05)— lo cierra el servicio: un Profesor
solo da de alta en una institucion que ya tiene en `usuario_institucion`, asi
que el desbloqueo sigue siendo la asignacion explicita del Administrador, no un
dropdown mas amplio. Ademas el equipo queda a nombre de quien crea aunque el
body mande otro `id_usuario`, y sobre el duenio Profesor aplican el maximo de 3
equipos y el nombre unico entre los suyos. Las reglas son del duenio, no del
que teclea: un Administrador tampoco pasa el limite a nombre de un Profesor.

---

## 6. Mapa de los endpoints con gate de rol

El inventario original contaba 70: `15 SuperAdmin + 45 Admin/SuperAdmin + 6
Árbitro + 4 Juez`. Hoy hay **71** y la diferencia está anotada en §6.6.

### 6.1 SuperAdmin exclusivo

| Dominio | Endpoints | Gate anterior → destino | Estado |
|---|---|---|---|
| Geografía | `POST` / `PUT` / `DELETE` de `regions`, `districts`, `localities` (9) | `requireAdmin` → `requireSuperAdmin` | aplicado en F1.4 |
| Seguridad | `GET /admin/login-lockouts` · `DELETE /admin/login-lockouts/:ip` (2) | `requireAdmin` → `requireSuperAdmin` | aplicado en F1.4 |
| Auditoría | `GET /audit/logs` (1) | `requireAdmin` → `requireSuperAdmin` | aplicado en F1.4 |
| Usuarios | `GET /users/:id` (1) | `authenticate` → `requireSuperAdmin` | aplicado en F1.1 |
| Usuarios | `POST /users` · `PUT /users/:id` · `DELETE /users/:id` (3) | `requireAdmin` → `requireSuperAdmin` | **pendiente: F1.6** |

> **Las tres escrituras de usuarios quedan en `requireAdminOrAbove` hasta que
> exista la primera cuenta SuperAdmin.** Pasarlas ahora sería un lockout, no un
> endurecimiento: en la base viva no hay ningún SuperAdmin, así que nadie podría
> crear el primero ni cambiarle el rol a nadie, y a diferencia de un 403 de
> lectura eso deja el sistema sin administración de usuarios y sin forma de
> recuperarla desde la aplicación. Ver §8.1.

> **Lo mismo aplica a geografía, seguridad y auditoría, que sí quedaron en
> SuperAdmin.** No es lockout con la misma gravedad —un admin puede pedirle a
> quien corresponda un cambio puntual, y el Admin sigue administrando la
> competencia—, pero conviene tenerlo presente al desplegar: entre el rebuild de
> `jebo-api` y la promoción de F1.6, `admin@jebo2026.com` no puede crear ni
> editar regiones, distritos ni localidades, ni leer la bitácora ni los bloqueos
> de login. Por eso F1 no se despliega a mitad de camino y F1.6 va junto con el
> rebuild de `jebo-web`.

### 6.2 Administración de la competencia — 45

El grupo que en el inventario estaba "en manos de Administrador". Los 45 de esta
tabla no quedan todos en `requireAdminOrAbove`: 35 se quedan ahí, 8 pasan a
`gestionarPresentacion` y 5 a `gestionarEquipoPropio`, y esos 13 además aceptan al
rol que corresponda (el Juez del jurado, el Profesor dueño o el Profesor que da
de alta, según §5). Las tres
escrituras de `usuario`, que figuran en §6.1, también están hoy en
`requireAdminOrAbove` por el lockout de §8.1.

| Origen | Endpoints | Gate anterior → destino |
|---|---|---|
| Etapas | `POST /stages` · `POST`+`PUT /stages/torneo/:id` · `PUT`+`DELETE /stages/:id` (5) | `requireAdmin` → `requireAdminOrAbove` |
| Presentaciones | `POST` · `GET`+`PUT`+`DELETE /:id` · `PATCH /:id/estado` · `GET /:id/resultado` · `POST /:id/calcular-resultado` · `GET /:id/validar-cierre` (8) | `requireAdmin` → `gestionarPresentacion` |
| Scoring formats | `POST` · `PUT /:id` · `DELETE /:id` (3) | `requireAdmin` → `requireAdminOrAbove` |
| Instancias | `POST` · `PUT /:id` · `DELETE /:id` (3) | `requireAdmin` → `requireAdminOrAbove` |
| Fixture | `POST /fixture/generate` · `GET /fixture/audit` (2) | `requireAdmin` → `requireAdminOrAbove` |
| Inscripciones | `POST /inscripcion/cerrar-vencidas` (1) | `requireAdmin` → `requireAdminOrAbove` |
| Equipos | `POST` (1) | `requireEditorOrAbove` → `gestionarEquipoPropio` (§5) |
| Equipos | `POST /enroll-batch` · `POST /:id/enroll` · `PUT /:id` · `DELETE /:id` (4) | `requireEditorOrAbove` → `gestionarEquipoPropio` |
| Torneos | `POST` · `PUT /:id` · `DELETE /:id` · `POST /:id/reglamento` (4) | `requireEditorOrAbove` → `requireAdminOrAbove` |
| Canchas | `POST` · `PUT /:id` · `PUT /:id/schedule` · `DELETE /:id` (4) | `requireEditorOrAbove` → `requireAdminOrAbove` |
| Disciplinas | `POST` · `PUT /:id` · `DELETE /:id` · `POST /:id/reglamento` (4) | `requireEditorOrAbove` → `requireAdminOrAbove` |
| Instituciones | `POST` · `PUT /:id` · `DELETE /:id` (3) | `requireEditorOrAbove` → `requireAdminOrAbove` |
| Partidos | `POST` · `PUT /:id` · `DELETE /:id` (3) | `requireEditorOrAbove` → `requireAdminOrAbove` |

Las 23 de `requireEditorOrAbove` son hoy **idénticas a `requireAdmin`**, así que
ese tramo es un rename, no un cambio de comportamiento. Con una excepción de
sentido: las cinco de equipos, que antes exigían Administrador y hoy aceptan
también al Profesor —las cuatro de gestión si es dueño, y el alta desde §5, en
su propia institución y hasta 3 equipos—. Ese es el único punto donde esta
familia de gates abre algo en vez de cerrarlo.

### 6.3 Árbitro — 6

| Endpoint | Gate anterior → destino |
|---|---|
| `GET /matches/mios` | `requireArbitroOrAdmin` → `operarPartido` |
| `PATCH /matches/:id/status` | ídem |
| `PATCH /matches/:id/result` | ídem |
| `POST /matches/:id/clock` | ídem |
| `POST /matches/:id/events` | ídem |
| `PATCH /matches/:id/events/:idEvento/anular` | ídem |

### 6.4 Juez — 4

| Endpoint | Gate anterior → destino |
|---|---|
| `GET /presentaciones` | `requireJuezOrAdmin` → `evaluarPresentacion` |
| `GET /presentaciones/:id/detalle-evaluacion` | ídem |
| `POST /presentaciones/:id/evaluaciones` | ídem |
| `GET /presentaciones/:id/evaluaciones` | ídem, **y saca el `?id_juez=`** (§8.2) |

### 6.5 Lo que queda en `authenticate`

**`GET /users` (lista)** queda en `authenticate`, no en un guard de rol: lo
necesitan los selectores de `TeamFormPage` (Profesores), `MatchFormPage`
(Árbitros) y `GymPresentacionesPage` (Jueces). Lo que cambia es **cuánto
devuelve** y **con qué filtro** (§8.1), no quién puede llamarlo.

**`GET /users/:id` (una fila) es distinto**: pasa a `requireSuperAdmin` porque su
único consumidor es la pantalla de edición de SuperAdmin, no un selector. Un
token de Profesor que pedía `/users/1` obtenía una fila del padrón; el corte por
rol cierra esa vía. El dato propio del Profesor sigue disponible en
`GET /auth/me`.

Los GET de lectura de todo lo demás también quedan en `authenticate`: el corte lo
hace `alcance`, no el guard.

### 6.6 Conciliación con el conteo de 70, y cómo se vigila

Después de F1.4 hay **71 endpoints con gate** en 17 archivos de rutas, y el
reparto real es:

| Guard | Endpoints |
|---|---|
| `requireAdminOrAbove` | 36 |
| `requireSuperAdmin` | 13 |
| `gestionarPresentacion` | 8 |
| `operarPartido` | 6 |
| `evaluarPresentacion` | 4 |
| `gestionarEquipoPropio` | 4 |
| **total** | **71** |

De 70 a 71 hay un solo endpoint nuevo: `GET /users/:id`, que estaba en
`authenticate` y pasó a `requireSuperAdmin` en F1.1, fuera del conteo original. No
se perdió ninguno de los 70: los tres de escritura de usuarios siguen contando,
pero como `requireAdminOrAbove` hasta F1.6.

Este reparto no está escrito solo en el documento: `tests/unit/rutas-permisos.test.js`
recorre `src/routes/*.js`, ignora comentarios y strings, y compara el mapa
endpoint → guard contra un snapshot. Mover un gate es una palabra en el archivo y
un problema de seguridad posible; con el snapshot, además del fallo, obliga a
actualizar la lista a mano en el mismo commit, que es donde queda el porqué. El
mismo test avisa si aparece un guard nuevo que no esté en la lista de nombres
conocidos, que es el modo de falla que un snapshot solo no ve.

---

## 7. Exposición pública (Invitado)

No existe hoy ninguna noción de publicación: cero columnas, cero flags. La única
visibilidad es `alcance`, que es institucional y del lado servidor.

El criterio no es "todo lo `Finalizado` es público" sino:

> **Un recurso es público cuando su estado de negocio permite exposición pública
> y no contiene información privada o administrativa.**

| Recurso | Público | Regla |
|---|---|---|
| Disciplinas | Sí | Dato maestro |
| Regiones / distritos / localidades | Sí | Dato maestro |
| Equipos | Sí | Equipos participantes o inscriptos |
| Torneos | Sí | Activos y finalizados |
| Partidos | según estado | Visible; el resultado, una vez cerrado |
| Eventos en vivo | según decisión | Solo si se ofrece marcador en vivo |
| Posiciones | Sí | Cuando hay información válida |
| Presentaciones | según estado | Resultado una vez finalizada |
| Usuarios | **Nunca** | — |
| Seguridad / IPs | **Nunca** | — |
| Auditoría interna | **Nunca** | — |

Los endpoints públicos son una **superficie separada**:

```
GET /api/public/tournaments
GET /api/public/teams
GET /api/public/matches
GET /api/public/standings
GET /api/public/results
GET /api/public/finals
GET /api/public/disciplines
```

Cada uno filtra explícitamente lo que expone y **nunca** reutiliza un endpoint
administrativo. El motivo es concreto: si `GET /api/tournaments` playgrounds con
`if (!user)`, cada endpoint nuevo hereda la pregunta equivocada y un olvido
publica datos privados.

Un `partido` en curso puede ser público si JEBO quiere mostrar marcador en vivo.
Por eso estado de negocio y regla de exposición están separados, y no se
materializa en un `publicado = true/false`.

Si más adelante aparece una necesidad real —"anunciar este torneo antes de que
empiece"— el mecanismo explícito sería `publicado_at` + `publicado_por`, no un
booleano. **No se agrega una columna ahora para resolver una necesidad
hipotética.**

---

## 8. Trabajo de seguridad que la Fase 1 tiene que cerrar

### 8.1 `GET /users` y `GET /users/:id` — **cerrado en F1.1**

**Lo que ya estaba resuelto (X-16).** `usuario.repository` recorta en SQL. La
proyección reducida es el DTO mínimo de los selectores: `id_usuario`, `nombre` y
`rol_descripcion`. `search` por documento solo funciona con la proyección
completa. Y las dos funciones **lanzan** si no reciben `alcance` y
`solicitanteId`.

**Lo que se cerró en F1.1.**

| Endpoint | Cambio | Motivo |
|---|---|---|
| `GET /users/:id` | `authenticate` → `requireSuperAdmin` | Tenía **un solo** consumidor: `UserFormPage` en modo edición. Cualquier autenticado podía leer una fila del padrón por id |
| `GET /users` | Exigir `?rol=` a quien **no** administra usuarios (403) | `GET /users` sin filtro es el padrón de personas. Los consumidores que no administran usuarios ya filtraban por rol, así que el costo es cero |
| `GET /users` | Quitar `estado` de la proyección reducida | Un Profesor no necesita saber si el Administrador está Activo ni cuándo se conectó por última vez |

**La distinción que faltaba: `alcance.global` ≠ administrar usuarios.** El
Árbitro es `global` porque arbitra partidos de todas las instituciones; no por
eso debe ver el padrón. Hasta F1.1 el repositorio preguntaba `alcance.global`, y
un Árbitro con `GET /users?rol=Arbitro` recibía la fila completa (email,
documento, estado) de **todos** los árbitros del sistema. La decisión ahora vive
en `alcance.service.puedeAdministrarUsuarios`, que es `[SUPERADMIN, ADMIN]`.

**Por qué `ADMIN` sigue en la lista y no solo `SUPERADMIN`.** El modelo pone la
administración de cuentas en SuperAdmin, pero las escrituras de `usuario`
(`POST`/`PUT`/`DELETE`) siguen en `requireAdminOrAbove`: pasarlas a SuperAdmin
hoy es un lockout, porque no existe ninguna cuenta con ese rol y nadie podría
crear la primera. Mientras un Admin pueda **crear y editar** usuarios, darle la
lista para leerlos es coherente. El recorte a SuperAdmin-only de la lista va
junto con el alta del primer SuperAdmin, **al final de F1.6** (con la promoción
definitiva y el rebuild del frontend, para que el cambio de contrato y el de UI
entren juntos).

**Bootstrap del primer SuperAdmin.** La migración crea el rol, no la cuenta.
Como `GET /users/:id` ya es SuperAdmin-only, una instalación existente —o una
fresca— necesita que alguien tenga ese rol para poder administrar usuarios. El
`seed` siembra `admin@jebo2026.com` como SuperAdmin, así que las instalaciones
nuevas quedan bien. Para una instalación existente, la promoción es explícita:

```sql
UPDATE usuario SET id_rol = (SELECT id_rol FROM rol WHERE descripcion = 'SuperAdmin')
WHERE lower(email) = lower('admin@jebo2026.com');
```

No se hace desde la migración a propósito: una migración que promueve por email
le daría god-mode en silencio a la cuenta que tenga ese email en cualquier
instalación. La decisión de **quién** es el primer SuperAdmin es operativa, no
de esquema.

**Ejecución en F1.2 y por qué se revirtió en la base viva.** La migración se
aplicó a `jebo_2026` (Batch 21) y `admin@jebo2026.com` se promovió para
verificarlo. Pero el **frontend viejo** decide el menú de admin con
`user.rol === 'Administrador' || user.id_rol === 1`, y `/auth/login` devuelve el
rol leído de la base. Con `SuperAdmin` el menú de admin desaparece para la cuenta
dueña. Como `jebo-web` sirve desde una imagen horneada y el árbol del frontend
está a mitad de refactor, desplegarlo para un fix de rol era peor que esperar.
Se revirtió la cuenta a `Administrador` (la migración queda: `SuperAdmin=20` es
parte del modelo) y la promoción definitiva se hace **al final de F1.6**, junto
con el helper de rol del frontend y el rebuild de `jebo-web`. No se creó ninguna
cuenta SuperAdmin temporal: los guards se verifican en tests de integración
contra Postgres real.

**Qué se movió a SuperAdmin en F1.4 y qué quedó abajo.** Geografía (9),
seguridad (2) y auditoría (1) suba ron de nivel. Escrituras de usuarios (3) y
lectura del padrón quedan en `requireAdminOrAbove`/`alcance`, por el lockout
descrito arriba. `GET /users/:id` es SuperAdmin-only desde F1.1, y con eso, hasta
que exista la primera cuenta SuperAdmin **nadie en la base viva puede abrir la
pantalla de edición de usuarios**: es un recorte deliberado y su costo es que esa
pantalla queda inaccesible hasta F1.6, no que quede abierta.

### 8.2 `GET /presentaciones/:id/evaluaciones` — **cerrado en F1.5**

Aceptaba `?id_juez=` y, si venía, ganaba sobre el token. El problema no era un
guard roto: `evaluarPresentacion` filtra por nivel **y** por jurado, y un juez
del jurado de esa presentación pasaba el filtro de sobra —era jurado, de hecho—.
Después elegía, con el mismo query string, de qué juez quería ver la hoja. El
filtro de jurado protege contra entrar, no contra mirar adentro.

El parámetro se **saca del contrato**, no se ignora: ignorarlo cerraría el
agujero y dejaría en la API una promesa que no se cumple, con un cliente que
sigue creyéndola. El juez sale de `req.user.id_usuario`.

El filtro de pertenencia al jurado ya lo aplicaba el servicio desde F1.3
(`assertEvaluarPresentacion`), tanto en `guardarHoja` como en
`getDetalleEvaluacion`. Este era el extremo que faltaba.

De paso se borró `evaluacion.service.getHoja`: sin un solo caller en `src`,
`tests` ni `scripts`, y con una firma —`id_juez` como argumento— que es
literalmente la del agujero. Código muerto con esa forma es una puerta giratoria:
el día que alguien lo cablee a un controlador, el `id_juez` entra desde el body.

La regla general quedó con test mecánico: **la identidad del que opera sale del
token, nunca del request** (`tests/unit/identidad-desde-el-token.test.js`). No
hay ningún `query('id_*')` de persona en los 17 routers, ni ningún
`req.query`/`req.body` de identidad en controladores y servicios. Las dos
designaciones que sí traen un `id_usuario` en el body —el dueño del equipo en su
alta y el jurado en el alta y la edición de una presentación— están enumeradas
una por una con su motivo, y el test verifica que las rutas que las cubren siguen
teniendo un guard de nivel administrativo.

### 8.3 Cambio de rol → `token_version` — **cerrado en F1.5**

Tres cosas juntas, porque comparten raíz: el token afirma el rol, y la base podía
dejar de afirmarlo sin que nadie invalidara el token.

**1. El bump.** `PUT /users/:id` con un `rol` distinto del actual sube
`token_version`. El mecanismo es el que ya usaba el cambio de contraseña; no se
creó nada nuevo. El `authenticate` ya tenía el comentario que documentaba la
ventana de obsolescencia de hasta 1 hora; esa ventana está cerrada para todo lo
que se cambia desde la aplicación.

**2. La atomicidad.** El contador viaja en el **mismo `UPDATE`** que escribe el
rol, no en un segundo. Con dos statements hay un instante real —el que media si el
segundo falla— en que el rol nuevo ya está escrito y el token viejo todavía
sirve: exactamente el estado que el punto 1 vino a cerrar. El incremento va en la
query (`COALESCE(token_version, 1) + 1`), no calculado en JS, para que dos admins
editando a la vez no se pisen con un read-modify-write.
`UsuarioRepository.actualizarSeguridad` es el único camino.

**3. Solo si el valor cambia.** El formulario de edición manda todos los campos.
Si "mandó `rol`" bastara para cortar sesión, guardar el usuario sin tocar nada
expulsaría a la persona de la aplicación. El servicio compara contra la fila que
ya lee para validar duplicados. El lado incorrecto de esa comparación es "no
cambió" —dejaría vivo un token con el rol anterior—, así que ante la duda se
cobra una sesión de más.

Qué cambios cortan sesión: `rol`, `estado`, `password`. Qué no: `nombre`, `email`,
`documento`, que son de perfil y no justifican un logout forzado por un tilde.
La bitácora distingue `CAMBIAR_ROL_USUARIO`, `CAMBIAR_ESTADO_USUARIO` y
`CAMBIAR_PASSWORD_USUARIO` de un `ACTUALIZAR_USUARIO`, con `sesion_cortada` y la
lista de campos que se tocaron.

### 8.4 `estado` escribible — **cerrado en F1.5**

`auth.service` ya rechazaba el login de un Inactivo, pero **no existía ninguna
forma administrativa de volver Inactivo a nadie**: la columna no estaba en la
allowlist del body. La comprobación existía sin disparador.

`estado` entra en `CAMPOS_USUARIO` y se valida contra `ESTADOS_USUARIO` en la
ruta (400) y en el servicio (`ValidationError`), que es la puerta real. Un estado
fuera del enum deja la cuenta en un limbo: el login la rechaza porque no es
`Activo` y ninguna pantalla la puede sacar de ahí.

Ojo con `COLUMNAS_SISTEMA` de `utils/columnas.js`, que hoy lista `estado` entre las
columnas de sistema: **no la aplica ningún middleware** —la frontera real es la
allowlist del controller—, y por eso `estado` se puede escribir sin romper nada.
Si algún día se cablea, hay que sacarlo de ese set en el mismo cambio o esta
escritura empieza a fallar sola. Se dejó intacto a propósito: fail-closed.

**Dos cosas que aparecieron al habilitar la columna.**

1. *El mensaje del login filtraba el padrón.* `auth.service` respondía
   `"Usuario inactivo"`. Con la rama muerta no importaba —nadie podía llegar—; al
   darle un disparador, probar `jefe@colegio.edu` con cualquier contraseña pasó a
   decir si la cuenta existe y si está dada de baja. Es el oráculo que un ataque
   de credenciales necesita para elegir a quién insistir. Ahora devuelve el mismo
   texto que una contraseña incorrecta, y el motivo real queda en la bitácora,
   que es donde un administrador lo busca.

2. *Desactivarse a uno mismo es un cierre de sesión sin vuelta.* El login bloquea
   al Inactivo, así que después del `PUT` no hay forma de volver a entrar desde la
   aplicación, y en una instalación con una sola cuenta administrativa eso deja el
   sistema sin nadie que lo administre. Se rechaza con 409. No es un permiso nuevo
   sobre los demás: desactivar a terceros sigue igual de permitido.

**Qué pasa con las sesiones abiertas.** Lo que se corta de inmediato es la
**renovación**: un refresh emitido antes queda 401. El access ya emitido sigue
sirviendo hasta que expira (1 h), porque su validez la decide la firma y no la
base —sin una consulta por request no se puede matar antes, que es el mismo
compromiso que ya se aceptaba para el cambio de contraseña—. Cerrar esa hora
exigiría un hit a la base en el camino caliente de los 121 endpoints, y no es una
decisión que se tome de paso.

La comparación contra la fila actual evita el falso positivo, pero no el caso
opuesto por diseño: reactivar corta la sesión de nuevo, y eso es correcto —si el
cambio de estado no cortara, el token de un Inactivo que alguien reactivó sin
volver a tocar el rol seguiría sirviendo—.

### 8.5 `alcance` y SuperAdmin — **cerrado en F0**

`ROLES_GLOBALES` es `[SUPERADMIN, ADMIN, ARBITRO]`; `SUPERADMIN` se sumó en F0 y
la lista quedó en un solo lugar (`constants/roles.js`), importada por
`alcance.service`. Sigue siendo una lista en código y no un flag en base, a
propósito: el criterio es de autorización y agregar un rol global no debería
requerir una migración de datos.

F1.1 agregó encima una lista **más chica** y con otro criterio,
`ROLES_USUARIOS = [SUPERADMIN, ADMIN]`, para "quién ve el padrón". No es una
duplicación de `ROLES_GLOBALES`: es un subconjunto con otro significado. Ver §8.1.

---

## 9. Fases

| Fase | Contenido | Estado |
|---|---|---|
| **F0** | Este documento. Actualizar `ROLES` y el README. `SUPERADMIN` + migración (prerrequisito de F1.1) | **Completada** |
| **F1.1** | Endpoints de usuarios: `GET /users/:id` → `requireSuperAdmin` · `GET /users` exige `?rol=` a quien no administra usuarios · proyección reducida sin `estado` · `puedeAdministrarUsuarios` para separar "global" de "administra usuarios" · guards base `requireSuperAdmin` / `requireAdminOrAbove` definidos (los gates se reaplican en F1.4) | **Completada** |
| **F1.2** | Migración de `SUPERADMIN` aplicada a la **base viva** (Batch 21): `rol` 20=SuperAdmin, ids 1/6/10/11 intactos. La promoción operativa de `admin@jebo2026.com` se hizo y se **revirtió a Administrador** por una incompatibilidad con el frontend viejo (éste decide el menú con `user.rol === 'Administrador'`, y /auth/login lee el rol de la base: SuperAdmin lo dejaba sin menú). La promoción definitiva es el último paso de F1.6. Guards verificados por tests (Admin y SuperAdmin administran usuarios; Árbitro no ve el padrón) | **Completada** |
| **F1.3** | Guards de recurso en `autorizacion.service` + `middleware/autorizacion.js`: `operarPartido`, `gestionarPresentacion`, `evaluarPresentacion`, `gestionarEquipoPropio`. `partido.service._assertArbitroAsignado` se generaliza y delega en la misma función (incluye SuperAdmin); el chequeo de jurado se centraliza. Corrige de paso dos huecos de SuperAdmin: `findMios` lo dejaba afuera y `guardarHoja` no lo dejaba cargar hoja. Los gates de las rutas se aplican en F1.4 | **Completada** |
| **F1.4** | Reaplicar los gates: geografía/seguridad/auditoría (12) → `requireSuperAdmin`; administración de la competencia (36, incluidas las 3 escrituras de usuarios) → `requireAdminOrAbove`; presentaciones (8) → `gestionarPresentacion`; equipos (4) → `gestionarEquipoPropio`; partidos y eventos (6) → `operarPartido`; hoja de evaluación (4) → `evaluarPresentacion`. El lote de inscripciones resuelve la propiedad de TODOS los equipos del body, antes de validar y en bloque. Renombrados `requireAdmin`/`requireEditorOrAbove` a `requireAdminOrAbove`, y retirados `requireArbitroOrAdmin`, `requireJuezOrAdmin` y `ROLES.EDITOR`. Snapshot mecánico de los 71 gates | **Completada** |
| **F1.5** | `estado` en la allowlist de usuario (hoy **no se puede activar ni desactivar** a nadie), validado contra `ESTADOS_USUARIO` · `token_version` sube **en el mismo `UPDATE`** que escribe el rol o el estado, y solo si el valor cambia · `?id_juez=` fuera del contrato de `GET /:id/evaluaciones` · se borra `getHoja`, que era la misma puerta sin caller · el login deja de decir "Usuario inactivo" (era un oráculo del padrón, inerte mientras la columna no se podía escribir) · no se puede desactivar la propia cuenta (409) · test mecánico de que la identidad sale del token | **Completada** |
| **F1.6** | Frontend: helper único de rol, eliminar los 7 `id_rol ===` y `USER_ROLES` · **promoción definitiva del primer SuperAdmin y recorte de `GET /users` a SuperAdmin-only**, junto con el rebuild de `jebo-web`, para no dejar producción a medio camino | Pendiente |
| **F2** | Logout que realmente revoca · resolver el 404 de reglamentos (`/uploads` no se sirve) · montar `usuario_institucion` (el controller existe sin router) · `TeamFormPage`: enviar `id_distrito` y castear los `id_*` a entero | Pendiente |
| **F3** | Los 5 dashboards con componentes compartidos + métricas nuevas (`/statistics/dashboard` hoy devuelve 4 contadores y no alcanza para ninguno) | Pendiente |
| **F4** | `/api/public/*` + las 7 páginas públicas | Pendiente |
| **F5** | Etapas (truncado a 10 filas) · `FinalPage` y `getStandings()` (hoy stub) · desinscripción · inscripción múltiple · UI para editar el jurado · dominio de participantes (`equipo_alumno` / `equipo_integrante`, hoy sin API) | Pendiente |

**F0 + F1 es el grueso del valor.** Los dashboards y el portal público se
construyen encima del modelo de autorización: hacer cualquiera de los dos
primero obliga a rehacer trabajo.

**Backend antes que frontend.** El frontend puede ocultar botones; el backend
tiene que impedir la operación aunque alguien llame al endpoint directamente.

---

## 10. Qué NO cambia

- `disciplina.tipo_competencia` sigue separando marcador de evaluación.
- `usuario_institucion` y el aislamiento X-05 no se tocan.
- `alcance` se sigue resolviendo en el middleware y pasando a los
  repositorios. Lo que cambia es **quién** tiene alcance global, no cómo se
  aplica.
- La cookie `httpOnly` y la rotación de refresh tokens no se tocan.
- El ledger de eventos, el reloj derivado y los eventos terminales no se tocan.
- El `documento` sigue siendo único.
- `partido` y `presentacion` **no** se unifican en un solo verbo.

---

## 11. Riesgos

| Riesgo | Mitigación |
|---|---|
| 70 puertas convertidas de golpe es un cambio grande | Se convierte endpoint por endpoint con la suite como red. Ningún otro cambio de comportamiento en esa fase |
| Un guard mal sembrado deja a alguien sin poder trabajar | La migración verifica al terminar que todo rol existente conserva al menos un gate que le sirva, y aborta nombrando la cuenta si no |
| Quitarle permisos al Árbitro lo deja sin poder operar | No aplica: se mantiene `operarPartido`. Pero el suite tiene que cubrir el caso "Árbitro asignado puede" y "Árbitro no asignado, no" |
| `GET /users` más restrictivo rompe un selector | Hay 3 consumidores no globales y los 3 ya filtran por rol. Se verifica con un test por consumidor |
| Agregar `SUPERADMIN` renumera `id_rol` | La migración inserta con id explícito y el frontend deja de depender de ids mágicos en la misma fase |
| El portal público expone un resultado antes de tiempo | Los endpoints públicos filtran por estado, no por "todo lo publicado", y no reutilizan endpoints administrativos |

---

## 12. Extensiones futuras, no implementadas

Quedan anotadas para que no se confundan con alcance:

- Noticias y comunicados.
- Tareas arbitrales: incidencias, sanciones, decisiones, observaciones.
- `publicado_at` / `publicado_by`.
- Marcador en vivo público.