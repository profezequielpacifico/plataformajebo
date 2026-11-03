const ESTADOS_TORNEO = {
  PROGRAMADO: 'Programado',
  EN_PROGRESO: 'En Progreso',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado'
};

const ESTADOS_PARTIDO = {
  PROGRAMADO: 'Programado',
  EN_JUEGO: 'En Juego',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
  PENDIENTE: 'Pendiente',
  // Una suspension es reversible: el partido vuelve a `En Juego` y el reloj se

  SUSPENDIDO: 'Suspendido'
};

/**
 * Estado del reloj de partido. Deliberadamente independiente de
 * `ESTADOS_PARTIDO`: un partido `En Juego` puede tener el reloj en `PAUSADO`
 * (lesion, disputa) sin que el estado del partido cambie.
 *
 * El tiempo transcurrido NUNCA se guarda como contador. Se deriva de
 * `reloj_acumulado_seg` mas el tiempo desde `reloj_iniciado_en`, y por eso
 * `PAUSADO` es el unico estado que necesita acumular.
 */
const ESTADOS_RELOJ = {
  PENDIENTE: 'PENDIENTE',
  EN_CURSO: 'EN_CURSO',
  PAUSADO: 'PAUSADO',
  FINALIZADO: 'FINALIZADO'
};

/**
 * Estado de un evento del ledger. Terminal: un evento anulado no vuelve a
 * confirmarse, la correccion es anular el viejo y registrar el nuevo.
 */
const ESTADOS_EVENTO = {
  CONFIRMADO: 'CONFIRMADO',
  ANULADO: 'ANULADO'
};

/**
 * Tipo de evento. En v1 solo se usa ANOTACION, pero la columna existe desde el
 * arranque: agregar tarjetas, faltas, cambios, sets o tiempos muertos despues es
 * un INSERT de valores nuevos, no una migracion.
 *
 * El nombre visible ("Gol" / "Punto") lo decide el frontend segun la
 * disciplina; el backend no depende de la palabra.
 */
const TIPOS_EVENTO = {
  ANOTACION: 'ANOTACION'
};

/** Rol del arbitro dentro del partido. */
const ROLES_ARBITRO = {
  PRINCIPAL: 'PRINCIPAL',
  ASISTENTE: 'ASISTENTE'
};

const ESTADOS_PRESENTACION = {
  PROGRAMADA: 'PROGRAMADA',
  EN_CURSO: 'EN_CURSO',
  FINALIZADA: 'FINALIZADA',
  CANCELADA: 'CANCELADA'
};

const ESTADOS_USUARIO = {
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo'
};

module.exports = {
  ESTADOS_TORNEO,
  ESTADOS_PARTIDO,
  ESTADOS_PRESENTACION,
  ESTADOS_RELOJ,
  ESTADOS_EVENTO,
  TIPOS_EVENTO,
  ROLES_ARBITRO,
  ESTADOS_USUARIO
};
