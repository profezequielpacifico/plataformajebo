const knex = require('../config/knex');

async function findSchedule(canchaId) {
  return knex('cancha_horario_semanal as chs')
    .select(
      'chs.id_cancha_horario',
      'chs.id_cancha',
      'chs.dia_semana',
      'chs.id_horario_cancha',
      'h.hora_inicio',
      'h.hora_fin'
    )
    .join('horarios_cancha as h', 'chs.id_horario_cancha', 'h.id_horario_cancha')
    .where('chs.id_cancha', canchaId)
    .orderBy(['chs.dia_semana', 'h.hora_inicio']);
}

async function findAllHorarios() {
  return knex('horarios_cancha').orderBy('hora_inicio');
}

async function replaceSchedule(canchaId, items) {
  const uniqueItems = items.filter(
    (item, index, arr) => arr.findIndex(i => i.dia_semana === item.dia_semana && i.id_horario_cancha === item.id_horario_cancha) === index
  );

  const rows = uniqueItems.map(item => ({
    id_cancha: canchaId,
    dia_semana: item.dia_semana,
    id_horario_cancha: item.id_horario_cancha
  }));

  await knex.transaction(async (trx) => {
    await trx('cancha_horario_semanal').where('id_cancha', canchaId).del();
    if (rows.length > 0) {
      await trx('cancha_horario_semanal').insert(rows);
    }
  });

  return findSchedule(canchaId);
}

module.exports = { findAllHorarios, findSchedule, replaceSchedule };