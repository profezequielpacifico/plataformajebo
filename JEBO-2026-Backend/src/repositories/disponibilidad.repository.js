const knex = require('../config/knex');

module.exports = {
  findAvailableSlots: (canchaId, fecha) =>
    knex('horarios_cancha as hc')
      .select('hc.*')
      .whereNotExists(function () {
        this.select('*')
          .from('disponibilidad_cancha as dc')
          .join('fecha_horario as fh', 'dc.fecha_horario', 'fh.fecha_horario')
          .join('fecha_cancha as fc', 'fh.id_fecha_cancha', 'fc.id_fecha_cancha')
          .join('partido as p', 'p.id_disponibilidad', 'dc.id_disponibilidad')
          .whereRaw('fh.id_horario_cancha = hc.id_horario_cancha')
          .where('dc.id_cancha', canchaId)
          .where('fc.fecha', fecha)
          .whereNot('p.estado', 'Cancelado')
      })
      .orderBy('hc.hora_inicio'),

  createDisponibilidad: (canchaId, fechaHorario) =>
    knex('disponibilidad_cancha')
      .insert({ id_cancha: canchaId, fecha_horario: fechaHorario })
      .returning('*').then(r => r[0])
};
