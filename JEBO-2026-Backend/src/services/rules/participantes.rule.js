/**
 * Regla de Participantes
 * 
 * Valida y procesa la lista de participantes de una etapa.
 * Verifica mínimos, máximos y restricciones configurables.
 */

module.exports = function participantesRule(context) {
  const { participants, config } = context;
  const warnings = [];
  const errores = [];

  const minimo = config?.minimo || 0;
  const maximo = config?.maximo || Infinity;

  // Validar mínimo
  if (participants.length < minimo) {
    errores.push(`Participantes insuficientes: ${participants.length}/${minimo}`);
  }

  // Validar máximo
  if (participants.length > maximo) {
    warnings.push(`Participantes exceden máximo: ${participants.length}/${maximo}`);
  }

  // Validar que haya al menos 2 participantes para competir
  if (participants.length < 2) {
    errores.push(`Se necesitan al menos 2 participantes para competir`);
  }

  // Verificar duplicados
  const ids = participants.map(p => p.id || p.equipo_id);
  const duplicados = ids.filter((id, idx) => ids.indexOf(id) !== idx);
  if (duplicados.length > 0) {
    errores.push(`Participantes duplicados: ${[...new Set(duplicados)].join(', ')}`);
  }

  return {
    valido: errores.length === 0,
    errores,
    warnings,
    total: participants.length
  };
};
