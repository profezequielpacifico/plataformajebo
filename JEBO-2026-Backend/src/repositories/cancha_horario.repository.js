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

async function createHorarios(horarios) {
  return knex.transaction(async (trx) => {
    await trx.raw('LOCK TABLE horarios_cancha IN SHARE ROW EXCLUSIVE MODE');
    const actuales = await trx('horarios_cancha').select('hora_inicio');
    const ocupadas = new Set(actuales.map((h) => String(h.hora_inicio).slice(0, 5)));
    const nuevos = horarios.filter((h) => !ocupadas.has(h.hora_inicio));
    const creados = nuevos.length
      ? await trx('horarios_cancha')
        .insert(nuevos.map((h) => ({ hora_inicio: `${h.hora_inicio}:00`, hora_fin: `${h.hora_fin}:00` })))
        .returning('*')
      : [];
    const existentes = horarios.filter((h) => ocupadas.has(h.hora_inicio)).map((h) => h.hora_inicio);
    return { creados, existentes };
  });
}

module.exports = { findAllHorarios, findSchedule, replaceSchedule, createHorarios };