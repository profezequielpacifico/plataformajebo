const knex = require('../config/knex');

class InscripcionService {
  async cerrarVencidas() {
    const vencidos = await knex('torneo')
      .whereNotNull('fecha_inscripcion_fin')
      .where('fecha_inscripcion_fin', '<=', knex.raw('NOW()'))
      .whereIn('estado', ['Programado', 'Activo'])
      .pluck('id_torneo');

    const resumen = [];
    for (const idTorneo of vencidos) {
      const [torneo] = await knex('torneo').where('id_torneo', idTorneo);
      if (!torneo) continue;

      const equipos = await knex('posicion')
        .where('id_torneo', idTorneo)
        .where('estado_torneo', 'Inscripto')
        .select('id_posicion');

      if (equipos.length) {
        await knex('posicion')
          .whereIn('id_posicion', equipos.map((e) => e.id_posicion))
          .update({ estado_torneo: '16avos' });
      }

      if (torneo.estado === 'Programado') {
        await knex('torneo').where('id_torneo', idTorneo).update({ estado: 'En Progreso' });
      }

      resumen.push({
        id_torneo: idTorneo,
        torneo: torneo.nombre,
        equipos_a_fase: equipos.length
      });
    }
    return resumen;
  }
}

module.exports = new InscripcionService();