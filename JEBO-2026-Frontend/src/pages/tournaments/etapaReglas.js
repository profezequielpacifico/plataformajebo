export const ETIQUETAS_AMBITO = {
    DISTRITO: 'Distrito',
    REGION: 'Región',
    INTERREGIONAL: 'Interregional',
    NACIONAL: 'Nacional',
    PERSONALIZADO: 'Personalizado'
};

export const ETIQUETAS_MODALIDAD = {
    LIGA: 'Todos contra todos',
    ELIMINACION: 'Eliminación directa',
    GRUPOS: 'Fase de grupos',
    EVALUACION: 'Evaluación por jurado'
};

const ORIGEN_EN_PLURAL = {
    DISTRITO: 'los distritos',
    REGION: 'las regiones',
    INTERREGIONAL: 'la etapa interregional',
    NACIONAL: 'la etapa nacional',
    PERSONALIZADO: 'una etapa personalizada'
};

export const REGLAS_POR_DEFECTO = {
    ambito: 'PERSONALIZADO',
    origen_tipo: 'INSCRIPCION',
    origen_ambito: null,
    clasifican_por_instancia: 1,
    mejores_adicionales: 0,
    territorios_por_instancia: null,
    avanza_si_unico: true
};

export function describirOrigen(etapa) {
    if (etapa.origen_tipo === 'MANUAL') return 'carga manual';
    if (etapa.origen_tipo === 'ETAPA') {
        return etapa.origen_ambito
            ? `clasificados de ${ORIGEN_EN_PLURAL[etapa.origen_ambito]}`
            : 'clasificados de la etapa anterior';
    }
    return 'inscripción al torneo';
}

const base = { ...REGLAS_POR_DEFECTO, descripcion: '', fecha_inicio: '', fecha_fin: '', tipo: 'LIGA', es_final: false };

export const crearEtapasJebo = (tipoCompetencia) => {
    const tipo = tipoCompetencia === 'EVALUACION' ? 'EVALUACION' : 'LIGA';
    return [
        { ...base, tipo, nombre: 'Distrital', orden: 1, ambito: 'DISTRITO', origen_tipo: 'INSCRIPCION' },
        { ...base, tipo, nombre: 'Regional', orden: 2, ambito: 'REGION', origen_tipo: 'ETAPA', origen_ambito: 'DISTRITO' },
        { ...base, tipo, nombre: 'Interregional', orden: 3, ambito: 'INTERREGIONAL', origen_tipo: 'ETAPA', origen_ambito: 'REGION' },
        { ...base, tipo, nombre: 'Nacional', orden: 4, ambito: 'NACIONAL', origen_tipo: 'ETAPA', origen_ambito: 'INTERREGIONAL', es_final: true }
    ];
};
