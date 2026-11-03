/**
 * Que torneos admiten partidos y cuáles no.
 *
 * El backend manda `disciplina.tipo_competencia` en cada torneo, y hay dos
 * modelos de competencia distintos:
 *
 *   - `MARCADOR`   → fútbol, futsal, voley. Un `partido` entre dos equipos.
 *   - `EVALUACION` → Gimnasia Artística. No hay partido: hay un encuentro
 *                    (`presentacion`) donde el equipo se presenta solo y lo
 *                    evalúa un jurado.
 *
 * Los selectores de torneo de Partidos, Alta de Partido y Fixtureautomático
 * listaban todos los torneos sin distinguir. Elegir uno de Gimnasia y tratar de
 * cargar un partido fallaba recién en el backend, con un 409 y un mensaje que
 * explicaba el modelo equivocado después de que el usuario ya llenó el
 * formulario. Filtrar acá convierte un error en algo que simplemente no está
 * en la lista.
 *
 * Un torneo sin `tipo_competencia` (respuesta vieja de la API, o disciplina
 * dada de alta antes de la columna) se considera `MARCADOR`: es el
 * comportamiento previo y no debe hacer desaparecer torneos de fútbol de los
 * selectores.
 */

export const TIPO_MARCADOR = 'MARCADOR';
export const TIPO_EVALUACION = 'EVALUACION';

/**
 * ¿Este torneo se compite con encuentros evaluados por un jurado?
 * @param {object} torneo
 * @returns {boolean}
 */
export function esTorneoDeEncuentros(torneo) {
    if (!torneo) return false;
    return (torneo.tipo_competencia || TIPO_MARCADOR) === TIPO_EVALUACION;
}

/**
 * Filtra los torneos que pueden tener partidos.
 * @param {Array<object>} torneos
 * @returns {Array<object>}
 */
export function soloTorneosConPartidos(torneos) {
    if (!Array.isArray(torneos)) return [];
    return torneos.filter(t => !esTorneoDeEncuentros(t));
}