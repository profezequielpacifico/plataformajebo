/**
 * StageEngine - Motor puro de evaluación de etapas.
 * 
 * Este módulo NO accede a la base de datos. Recibe un contexto con
 * participantes, reglas y resultados, y devuelve un resultado determinista.
 * 
 * Principios:
 * - El nombre de la etapa nunca determina su comportamiento
 * - No mezclar clasificación (quién pasa) con competición (cómo compiten)
 * - Ser determinista: mismo input = mismo output
 */

class StageEngine {
  /**
   * Evalúa una etapa y devuelve quién clasifica.
   * @param {Object} context - Contexto de evaluación
   * @param {Array} context.participants - Lista de participantes con { id, posicion, puntos, ... }
   * @param {Array} context.rules - Reglas activas de la etapa
   * @param {Object} context.config - Configuración de la etapa
   * @returns {Object} Resultado con clasificados, grupos y advertencias
   */
  evaluate(context) {
    this._validateContext(context);
    
    const { participants, rules, config } = context;
    const warnings = [];

    // 1. Validar participantes mínimos
    const participantesRule = rules.find(r => r.tipo === 'PARTICIPANTES');
    if (participantesRule) {
      const min = participantesRule.configuracion?.minimo || 0;
      const max = participantesRule.configuracion?.maximo || Infinity;
      
      if (participants.length < min) {
        return {
          viable: false,
          motivo: `Participantes insuficientes: ${participants.length}/${min}`,
          clasificados: [],
          grupos: [],
          warnings
        };
      }
      
      if (participants.length > max) {
        warnings.push(`Participantes exceden máximo: ${participants.length}/${max}`);
      }
    }

    // 2. Evaluar regla de competición (cómo se organizan)
    const competicionRule = rules.find(r => r.tipo === 'COMPETICION');
    const formato = competicionRule?.configuracion?.formato || 'ELIMINACION';

    // 3. Evaluar regla de clasificación (quién pasa)
    const clasificacionRule = rules.find(r => r.tipo === 'CLASIFICACION');
    const metodo = clasificacionRule?.configuracion?.metodo || 'POSICION';
    const cantidad = clasificacionRule?.configuracion?.cantidad || 1;

    // 4. Calcular clasificados según método
    let clasificados = [];
    
    switch (metodo) {
      case 'POSICION':
        clasificados = this._clasificarPorPosicion(participants, cantidad);
        break;
      case 'GANADOR':
        clasificados = this._clasificarPorGanador(participants, cantidad);
        break;
      default:
        warnings.push(`Método de clasificación desconocido: ${metodo}`);
    }

    // 5. Formar grupos con TODOS los participantes (no solo clasificados)
    let grupos = [];
    if (formato === 'GRUPOS') {
      grupos = this._formarGrupos(participants, competicionRule?.configuracion);
    }

    // 6. Orden para eliminación con TODOS los participantes
    const ordenEliminacion = this._calcularOrdenEliminacion(participants, formato);

    return {
      viable: true,
      clasificados,
      grupos,
      ordenEliminacion,
      warnings
    };
  }

  _validateContext(context) {
    if (!context || typeof context !== 'object') {
      throw new Error('StageEngine requiere un contexto válido');
    }
    if (!Array.isArray(context.participants)) {
      throw new Error('Contexto debe incluir participants como array');
    }
    if (!Array.isArray(context.rules)) {
      throw new Error('Contexto debe incluir rules como array');
    }
  }

  /**
   * Clasifica por posición (orden de llegada).
   * Los primeros N participantes clasifican.
   */
  _clasificarPorPosicion(participants, cantidad) {
    return participants
      .slice()
      .sort((a, b) => (a.posicion || 0) - (b.posicion || 0))
      .slice(0, cantidad)
      .map((p, idx) => ({
        ...p,
        orden_clasificacion: idx + 1
      }));
  }

  /**
   * Clasifica por ganador (mejor puntaje).
   * Los N mejores por puntos clasifican.
   */
  _clasificarPorGanador(participants, cantidad) {
    return participants
      .slice()
      .sort((a, b) => {
        // Primero por puntos
        if ((b.puntos || 0) !== (a.puntos || 0)) {
          return (b.puntos || 0) - (a.puntos || 0);
        }
        // Luego por diferencia de goles
        const diffA = (a.gf || 0) - (a.gc || 0);
        const diffB = (b.gf || 0) - (b.gc || 0);
        return diffB - diffA;
      })
      .slice(0, cantidad)
      .map((p, idx) => ({
        ...p,
        orden_clasificacion: idx + 1
      }));
  }

  /**
   * Forma grupos de participantes.
   * Distribuye de forma determinista.
   */
  _formarGrupos(participants, config) {
    const tamaño = config?.tamano_grupo || 4;
    const grupos = [];
    
    for (let i = 0; i < participants.length; i += tamaño) {
      grupos.push(participants.slice(i, i + tamaño));
    }
    
    return grupos;
  }

  /**
   * Calcula el orden de cruces para eliminación.
   * 1 vs N, 2 vs N-1, 3 vs N-2, etc.
   */
  _calcularOrdenEliminacion(participants, formato) {
    if (formato !== 'ELIMINACION') {
      return [];
    }

    const orden = [];
    const n = participants.length;
    
    for (let i = 0; i < Math.floor(n / 2); i++) {
      orden.push({
        llave: i + 1,
        local: participants[i]?.id,
        visitante: participants[n - 1 - i]?.id
      });
    }
    
    return orden;
  }
}

module.exports = new StageEngine();
