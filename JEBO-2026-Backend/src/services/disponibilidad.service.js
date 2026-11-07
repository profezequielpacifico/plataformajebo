const knex = require('../config/knex');
const DisponibilidadRepository = require('../repositories/disponibilidad.repository');
const { ValidationError } = require('../utils/errors');

const aHHMM = (hora) => String(hora).trim().slice(0, 5);

const disponibilidadService = {
  async getAvailableSlots(canchaId, fecha) {
    const slots = await DisponibilidadRepository.findAvailableSlots(canchaId, fecha);
    return slots;
  },

  async createDisponibilidad(canchaId, fecha, horaInicio) {
    let fc = await knex('fecha_cancha').where('fecha', fecha).first();
    if (!fc) [fc] = await knex('fecha_cancha').insert({ fecha }).returning('*');

    const horarios = await knex('horarios_cancha').orderBy('hora_inicio');
    const horario = horarios.find((h) => aHHMM(h.hora_inicio) === aHHMM(horaInicio));
    if (!horario) {
      throw new ValidationError(
        `El horario ${horaInicio} no existe para las canchas. ` +
        `Horarios disponibles: ${horarios.map((h) => aHHMM(h.hora_inicio)).join(', ')}`
      );
    }

    const dateTime = `${fecha} ${aHHMM(horario.hora_inicio)}:00`;
    let fh = await knex('fecha_horario')
      .where('fecha_horario', dateTime)
      .first();
    if (!fh) {
      await knex('fecha_horario')
        .insert({ fecha_horario: dateTime, id_fecha_cancha: fc.id_fecha_cancha, id_horario_cancha: horario.id_horario_cancha });
    }

    let disp = await knex('disponibilidad_cancha')
      .where('fecha_horario', dateTime)
      .where('id_cancha', canchaId)
      .first();
    if (!disp) {
      [disp] = await knex('disponibilidad_cancha')
        .insert({ fecha_horario: dateTime, id_cancha: canchaId })
        .returning('*');
    }

    return disp;
  }
};

module.exports = disponibilidadService;
