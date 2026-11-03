const knex = require('../config/knex');
const alcanceService = require('../services/alcance.service');
const { assertTorneoAceptaPartidos } = require('./tipoCompetencia.service');
const { NotFoundError, BusinessError } = require('../utils/errors');

class FixtureService {
  /**
   * Estado del fixture de un torneo.
   *
   * `alcance` es obligatorio (X-05). El endpoint es `authenticate` sin
   * `requireRole`, así que lo puede pedir un Profesor: sin el filtro, alcanzaba
   * con adivinar un `id_torneo` para leer el nombre y las fechas de un torneo
   * ajenos, y para saber si su fixture ya estaba generado.
   *
   * Devuelve la MISMA forma que antes —`{ generado: false, torneo: null }`—
   * cuando el torneo no existe o cuando existe pero no es visible. Indistinguir
   * los dos casos confirmaría que el `id_torneo` es válido, que es justo lo que
   * se está evitando.
   */
  async getByIdTorneo(idTorneo, alcance) {
    if (!alcance || typeof alcance.global !== 'boolean') {
      throw new Error(
        'FixtureService.getByIdTorneo requiere un alcance resuelto (X-05). ' +
        'Un endpoint de lectura no debe llamar al servicio sin pasar `req.alcance`.'
      );
    }

    const torneo = await alcanceService
      .filtrarPorTorneosConEquipo(
        knex('torneo').where('id_torneo', idTorneo),
        alcance,
        'torneo.id_torneo'
      )
      .first();

    if (!torneo) return { generado: false, torneo: null };

    const reg = await knex('fixture_generado').where('id_torneo', idTorneo).first();
    return {
      generado: !!reg,
      torneo: {
        id_torneo: torneo.id_torneo,
        nombre: torneo.nombre,
        fecha_inicio: torneo.fecha_inicio,
        fecha_fin: torneo.fecha_fin,
        vigente: !torneo.fecha_fin || new Date(torneo.fecha_fin) >= new Date()
      }
    };
  }

  async generate(idTorneo, userId) {
    const torneo = await knex('torneo').where('id_torneo', idTorneo).first();
    if (!torneo) throw new NotFoundError('Torneo no encontrado');

    // Un fixture ES una lista de partidos local/visitante, así que generarlo en
    // un torneo de Gimnasia no produce un fixture raro: produce el modelo
    // equivocado entero. Con dos trios inscriptos armaba un round-robin de 2
    // partidos que en la disciplina no existen. El guard va antes de leer
    // `posicion` para que el mensaje sea el del tipo de competencia y no el de
    // "necesita al menos 2 equipos".
    await assertTorneoAceptaPartidos(idTorneo);

    const equipos = await knex('posicion')
      .where('id_torneo', idTorneo)
      .orderBy('id_equipo')
      .pluck('id_equipo')
      .then((ids) => ids.filter(Boolean));

    if (equipos.length < 2) {
      throw new BusinessError('El torneo necesita al menos 2 equipos inscriptos');
    }

    return knex.transaction(async (trx) => {
      await this._verificarNoGenerado(trx, idTorneo);

      const schedule = await trx('cancha_horario_semanal as chs')
        .select(
          'chs.id_cancha',
          'chs.dia_semana',
          'chs.id_horario_cancha',
          'h.hora_inicio'
        )
        .join('horarios_cancha as h', 'chs.id_horario_cancha', 'h.id_horario_cancha')
        .orderBy(['chs.dia_semana', 'h.hora_inicio', 'chs.id_cancha']);

      const rondaMatches = this._roundRobin(equipos);
      const fechaInicio = torneo.fecha_inicio ? this._localDate(torneo.fecha_inicio) : new Date();

      const { matches, rondas } = await this._generarPartidos({
        trx,
        idTorneo,
        rondaMatches,
        schedule,
        fechaInicio
      });

      await trx('fixture_generado').insert({ id_torneo: idTorneo, id_usuario: userId || null });

      return {
        generado: true,
        id_torneo: idTorneo,
        torneo: torneo.nombre,
        equipos: equipos.length,
        rondas,
        partidos: matches.length,
        matches
      };
    });
  }

  async _verificarNoGenerado(trx, idTorneo) {
    const yaGenerado = await trx('fixture_generado').where('id_torneo', idTorneo).first();
    if (yaGenerado) {
      throw new BusinessError(
        'El fixture ya fue generado para este torneo. La operación no se puede repetir con el mismo torneo hasta que el torneo vence.'
      );
    }
  }

  async _generarPartidos({ trx, idTorneo, rondaMatches, schedule, fechaInicio }) {
    const matches = [];
    let rondaIdx = 1;

    for (const ronda of rondaMatches) {
      const fechaPartido = new Date(fechaInicio);
      fechaPartido.setDate(fechaPartido.getDate() + (rondaIdx - 1));
      const fechaStr = this._fmtDate(fechaPartido);
      const diaSemana = this._diaSemana(fechaPartido);

      const slots = schedule.filter(s => s.dia_semana === diaSemana);
      if (slots.length === 0) {
        throw new BusinessError(
          `No hay canchas con horarios disponibles para el día ${this._nombreDia(diaSemana)} (${fechaStr}). ` +
          'Cargá los días y horarios disponibles de las canchas antes de generar el fixture.'
        );
      }

      let posicionMatch = 0;
      for (const pareja of ronda) {
        const { local, visitante } = pareja;
        if (local === null || visitante === null) continue;

        posicionMatch++;

        const slot = slots[(posicionMatch + rondaIdx - 1) % slots.length];
        const idDisponibilidad = await this._asegurarDisponibilidad(trx, slot, fechaStr);

        const partido = await this._crearPartido(trx, idTorneo, rondaIdx, idDisponibilidad, local, visitante);

        matches.push({
          id_partido: partido.id_partido,
          ronda: rondaIdx,
          fecha: fechaStr,
          id_equipo_local: partido.id_equipo_local,
          id_equipo_visitante: partido.id_equipo_visitante
        });
      }
      rondaIdx++;
    }

    return { matches, rondas: rondaMatches.length };
  }

  async _asegurarDisponibilidad(trx, slot, fechaStr) {
    const dateTime = `${fechaStr} ${slot.hora_inicio}`;

    let fc = await trx('fecha_cancha').where('fecha', fechaStr).first();
    if (!fc) [fc] = await trx('fecha_cancha').insert({ fecha: fechaStr }).returning('*');

    let fh = await trx('fecha_horario').where('fecha_horario', dateTime).first();
    if (!fh) {
      await trx('fecha_horario')
        .insert({ fecha_horario: dateTime, id_fecha_cancha: fc.id_fecha_cancha, id_horario_cancha: slot.id_horario_cancha });
    }

    let disp = await trx('disponibilidad_cancha')
      .where('fecha_horario', dateTime)
      .where('id_cancha', slot.id_cancha)
      .first();
    if (!disp) {
      [disp] = await trx('disponibilidad_cancha')
        .insert({ fecha_horario: dateTime, id_cancha: slot.id_cancha })
        .returning('*');
    }

    return disp.id_disponibilidad;
  }

  async _crearPartido(trx, idTorneo, rondaIdx, idDisponibilidad, local, visitante) {
    const [partido] = await trx('partido')
      .insert({
        id_torneo: idTorneo,
        id_disponibilidad: idDisponibilidad,
        id_equipo_local: local,
        id_equipo_visitante: visitante,
        goles_local: 0,
        goles_visitante: 0,
        estado: 'Pendiente'
      })
      .returning('*');

    await trx('partido_ronda').insert({ id_partido: partido.id_partido, id_ronda: rondaIdx });
    return partido;
  }

  _localDate(value) {
    if (value instanceof Date) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    const s = String(value);
    if (s.includes('T')) {
      const d = new Date(value);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  _fmtDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  _diaSemana(date) {
    const jsDay = date.getDay();
    return jsDay === 0 ? 7 : jsDay;
  }

  _nombreDia(diaSemana) {
    const dias = {
      1: 'Lunes',
      2: 'Martes',
      3: 'Miércoles',
      4: 'Jueves',
      5: 'Viernes',
      6: 'Sábado',
      7: 'Domingo'
    };
    return dias[diaSemana] || String(diaSemana);
  }

  _roundRobin(equipos) {
    let base = equipos.slice();
    if (base.length % 2 === 1) base.push(null);
    const totalRondas = base.length - 1;
    const rondas = [];

    for (let r = 0; r < totalRondas; r++) {
      const matches = [];
      for (let i = 0; i < base.length / 2; i++) {
        matches.push({ local: base[i], visitante: base[base.length - 1 - i] });
      }
      rondas.push(matches);

      base = [base[0], ...base.slice(2), base[1]];
    }
    return rondas;
  }
}

module.exports = new FixtureService();