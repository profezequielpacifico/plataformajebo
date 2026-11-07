class StageEngine {
  evaluate(context) {
    this._validateContext(context);
    
    const { participants, rules, config } = context;
    const warnings = [];

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

    const competicionRule = rules.find(r => r.tipo === 'COMPETICION');
    const formato = competicionRule?.configuracion?.formato || 'ELIMINACION';

    const clasificacionRule = rules.find(r => r.tipo === 'CLASIFICACION');
    const metodo = clasificacionRule?.configuracion?.metodo || 'POSICION';
    const cantidad = clasificacionRule?.configuracion?.cantidad || 1;

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

    let grupos = [];
    if (formato === 'GRUPOS') {
      grupos = this._formarGrupos(participants, competicionRule?.configuracion);
    }

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

  _clasificarPorGanador(participants, cantidad) {
    return participants
      .slice()
      .sort((a, b) => {
        if ((b.puntos || 0) !== (a.puntos || 0)) {
          return (b.puntos || 0) - (a.puntos || 0);
        }
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

  _formarGrupos(participants, config) {
    const tamaño = config?.tamano_grupo || 4;
    const grupos = [];
    
    for (let i = 0; i < participants.length; i += tamaño) {
      grupos.push(participants.slice(i, i + tamaño));
    }
    
    return grupos;
  }

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
