module.exports = function clasificacionRule(context) {
  const { participants, config } = context;
  const warnings = [];
  const errores = [];

  const metodo = config?.metodo || 'POSICION';
  const cantidad = config?.cantidad || 1;
  const unidad = config?.unidad || 'COMPETENCIA';

  const metodosValidos = ['POSICION', 'GANADOR'];
  if (!metodosValidos.includes(metodo)) {
    errores.push(`Método de clasificación inválido: ${metodo}. Válidos: ${metodosValidos.join(', ')}`);
  }

  if (cantidad < 1) {
    errores.push(`Cantidad de clasificados inválida: ${cantidad}`);
  }

  if (cantidad > participants.length) {
    errores.push(`No se pueden clasificar ${cantidad} si solo hay ${participants.length} participantes`);
  }

  let clasificados = [];

  switch (metodo) {
    case 'POSICION':
      clasificados = participants
        .slice()
        .sort((a, b) => (a.posicion || 0) - (b.posicion || 0))
        .slice(0, cantidad);
      break;

    case 'GANADOR':
      clasificados = participants
        .slice()
        .sort((a, b) => {
          const puntosA = a.puntos || 0;
          const puntosB = b.puntos || 0;
          if (puntosB !== puntosA) return puntosB - puntosA;
          const diffA = (a.gf || 0) - (a.gc || 0);
          const diffB = (b.gf || 0) - (b.gc || 0);
          return diffB - diffA;
        })
        .slice(0, cantidad);
      break;
  }

  return {
    valido: errores.length === 0,
    errores,
    warnings,
    metodo,
    unidad,
    clasificados: clasificados.map(c => c.id || c.equipo_id)
  };
};
