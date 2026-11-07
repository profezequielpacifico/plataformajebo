module.exports = function competicionRule(context) {
  const { participants, config } = context;
  const warnings = [];
  const errores = [];

  const formato = config?.formato || 'ELIMINACION';

  switch (formato) {
    case 'ELIMINACION':
      if (participants.length < 2) {
        errores.push('Eliminación requiere al menos 2 participantes');
      }
      break;

    case 'GRUPOS': {
      const tamaño = config?.tamano_grupo || 4;
      if (tamaño < 2) {
        errores.push(`Tamaño de grupo inválido: ${tamaño}`);
      }
      if (participants.length < tamaño) {
        errores.push(`Se necesitan al menos ${tamaño} participantes para formar un grupo`);
      }
      const cantidadGrupos = Math.ceil(participants.length / tamaño);
      warnings.push(`Se formarán ${cantidadGrupos} grupos de ~${tamaño} participantes`);
      break;
    }

    case 'LIGA':
      if (participants.length < 2) {
        errores.push('Liga requiere al menos 2 participantes');
      }
      break;

    default:
      errores.push(`Formato de competición desconocido: ${formato}`);
  }

  return {
    valido: errores.length === 0,
    errores,
    warnings,
    formato
  };
};
