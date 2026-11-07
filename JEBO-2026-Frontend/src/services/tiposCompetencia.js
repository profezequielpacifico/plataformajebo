export const TIPO_MARCADOR = 'MARCADOR';
export const TIPO_EVALUACION = 'EVALUACION';

export function esTorneoDeEncuentros(torneo) {
    if (!torneo) return false;
    return (torneo.tipo_competencia || TIPO_MARCADOR) === TIPO_EVALUACION;
}

export function soloTorneosConPartidos(torneos) {
    if (!Array.isArray(torneos)) return [];
    return torneos.filter(t => !esTorneoDeEncuentros(t));
}