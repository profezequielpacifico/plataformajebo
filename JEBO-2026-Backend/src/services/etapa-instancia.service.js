const knex = require('../config/knex');
const bitacoraService = require('./bitacora.service');
const fixtureService = require('./fixture.service');
const { ordenarTabla, resolverCorte, resolverConDesempate, repartirEnZonas } = require('./tabla-instancia');
const { NotFoundError, BusinessError } = require('../utils/errors');

const ESTADO_FINALIZADA = 'Finalizada';

class EtapaInstanciaService {
  async _etapaConTorneo(idEtapa, trx = knex) {
    const etapa = await trx('etapa as et')
      .select('et.*', 'd.tipo_competencia', 'd.id_disciplina')
      .join('torneo as t', 't.id_torneo', 'et.id_torneo')
      .join('disciplina as d', 'd.id_disciplina', 't.id_disciplina')
      .where('et.id_etapa', idEtapa)
      .first();
    if (!etapa) throw new NotFoundError('Etapa no encontrada');
    return etapa;
  }

  _modalidad(etapa) {
    if (etapa.tipo_competencia === 'EVALUACION') return 'EVALUACION';
    return etapa.tipo || 'LIGA';
  }

  async _etapaOrigen(etapa, trx) {
    if (etapa.id_etapa_origen) {
      const elegida = await trx('etapa')
        .where({ id_etapa: etapa.id_etapa_origen, id_torneo: etapa.id_torneo })
        .first();
      if (!elegida) throw new BusinessError('La etapa de origen no pertenece a este torneo');
      return elegida;
    }
    const anteriores = trx('etapa')
      .where('id_torneo', etapa.id_torneo)
      .where('orden', '<', etapa.orden)
      .orderBy('orden', 'desc');
    if (etapa.origen_ambito) anteriores.where('ambito', etapa.origen_ambito);
    const origen = await anteriores.first();
    if (!origen) {
      throw new BusinessError(`La etapa "${etapa.nombre}" toma equipos de otra etapa, pero no hay una etapa anterior que coincida`);
    }
    return origen;
  }

  async _candidatos(etapa, trx) {
    if (etapa.origen_tipo === 'MANUAL') return [];

    if (etapa.origen_tipo === 'INSCRIPCION') {
      const filas = await trx('posicion').where('id_torneo', etapa.id_torneo).select('id_equipo');
      return filas.map((f) => ({ id_equipo: f.id_equipo, motivo: 'INSCRIPCION' }));
    }

    const origen = await this._etapaOrigen(etapa, trx);
    if (origen.estado !== ESTADO_FINALIZADA) {
      throw new BusinessError(`Primero tiene que finalizar la etapa "${origen.nombre}"`);
    }
    const filas = await trx('instancia_participante as ip')
      .join('etapa_instancia as ei', 'ei.id_etapa_instancia', 'ip.id_etapa_instancia')
      .where('ei.id_etapa', origen.id_etapa)
      .where('ip.clasificado', true)
      .select('ip.id_equipo', 'ip.id_etapa_instancia', 'ip.posicion_final');
    return filas.map((f) => ({
      id_equipo: f.id_equipo,
      motivo: 'CLASIFICADO',
      id_instancia_origen: f.id_etapa_instancia,
      posicion_origen: f.posicion_final
    }));
  }

  async _conTerritorio(candidatos, trx) {
    if (candidatos.length === 0) return [];
    const filas = await trx('equipo as e')
      .join('institucion as i', 'i.id_institucion', 'e.id_institucion')
      .join('distrito as dis', 'dis.id_distrito', 'i.id_distrito')
      .whereIn('e.id_equipo', candidatos.map((c) => c.id_equipo))
      .select(
        'e.id_equipo',
        'e.nombre as equipo_nombre',
        'dis.id_distrito',
        'dis.nombre as distrito_nombre',
        knex.raw(`(
          SELECT l.id_region FROM localidad l
          WHERE l.id_distrito = dis.id_distrito AND l.id_region IS NOT NULL
          LIMIT 1
        ) AS id_region`)
      );
    const territorios = new Map(filas.map((f) => [f.id_equipo, f]));
    return candidatos.map((c) => ({ ...c, ...territorios.get(c.id_equipo) }));
  }

  async _agrupar(etapa, candidatos, trx) {
    const unica = () => [{ nombre: etapa.nombre, territorios: [], equipos: candidatos }];

    if (etapa.ambito === 'DISTRITO') {
      const grupos = new Map();
      for (const c of candidatos) {
        if (!grupos.has(c.id_distrito)) {
          grupos.set(c.id_distrito, {
            nombre: c.distrito_nombre,
            territorios: [{ id_distrito: c.id_distrito }],
            equipos: []
          });
        }
        grupos.get(c.id_distrito).equipos.push(c);
      }
      return [...grupos.values()];
    }

    if (etapa.ambito === 'REGION' || etapa.ambito === 'INTERREGIONAL') {
      const sinRegion = candidatos.filter((c) => !c.id_region);
      if (sinRegion.length > 0) {
        throw new BusinessError(`Equipos sin región: ${sinRegion.map((c) => c.equipo_nombre).join(', ')}`);
      }
      const idsRegion = [...new Set(candidatos.map((c) => c.id_region))];
      const regiones = await trx('region').whereIn('id_region', idsRegion).orderBy('id_region');

      if (etapa.ambito === 'REGION') {
        return regiones.map((r) => ({
          nombre: r.nombre,
          territorios: [{ id_region: r.id_region }],
          equipos: candidatos.filter((c) => c.id_region === r.id_region)
        }));
      }
      if (!etapa.territorios_por_instancia) return unica();
      return repartirEnZonas(regiones, etapa.territorios_por_instancia).map((zona, indice) => {
        const ids = zona.map((r) => r.id_region);
        return {
          nombre: `Zona ${indice + 1}`,
          territorios: ids.map((id_region) => ({ id_region })),
          equipos: candidatos.filter((c) => ids.includes(c.id_region))
        };
      });
    }

    return unica();
  }

  async _quitarInstanciasPrevias(etapa, trx) {
    const previas = await trx('etapa_instancia').where('id_etapa', etapa.id_etapa).pluck('id_etapa_instancia');
    if (previas.length === 0) return;
    const [partidos, presentaciones] = await Promise.all([
      trx('partido').whereIn('id_etapa_instancia', previas).count('* as n').first(),
      trx('presentacion').whereIn('id_etapa_instancia', previas).count('* as n').first()
    ]);
    if (Number(partidos.n) > 0 || Number(presentaciones.n) > 0) {
      throw new BusinessError('La etapa ya tiene encuentros generados: no se puede volver a preparar');
    }
    const usados = await trx('instancia_participante').whereIn('id_instancia_origen', previas).count('* as n').first();
    if (Number(usados.n) > 0) {
      throw new BusinessError('Una etapa posterior ya tomó equipos de esta: no se puede volver a preparar');
    }
    await trx('etapa_instancia').whereIn('id_etapa_instancia', previas).del();
  }

  _avanzaDirecto(etapa, cantidad) {
    return etapa.avanza_si_unico && cantidad === 1;
  }

  _zonasManuales(zonas, candidatos) {
    const porEquipo = new Map(candidatos.map((c) => [Number(c.id_equipo), c]));
    const asignados = new Set();
    const nombres = new Set();
    const grupos = zonas.map((zona) => {
      const nombre = String(zona.nombre || '').trim();
      if (!nombre) throw new BusinessError('Cada zona necesita un nombre');
      if (nombres.has(nombre)) throw new BusinessError(`La zona "${nombre}" aparece más de una vez`);
      nombres.add(nombre);
      const equipos = (zona.equipos || []).map((id) => {
        const candidato = porEquipo.get(Number(id));
        if (!candidato) throw new BusinessError(`El equipo ${id} no está habilitado para esta etapa`);
        if (asignados.has(Number(id))) throw new BusinessError(`El equipo "${candidato.equipo_nombre}" está en más de una zona`);
        asignados.add(Number(id));
        return candidato;
      });
      if (equipos.length === 0) throw new BusinessError(`La zona "${nombre}" no tiene equipos`);
      const regiones = [...new Set(equipos.map((e) => e.id_region).filter(Boolean))];
      return { nombre, territorios: regiones.map((id_region) => ({ id_region })), equipos };
    });
    const sinZona = candidatos.filter((c) => !asignados.has(Number(c.id_equipo)));
    if (sinZona.length > 0) {
      throw new BusinessError(`Equipos sin zona: ${sinZona.map((c) => c.equipo_nombre).join(', ')}`);
    }
    return grupos;
  }

  async preparar(idEtapa, context = {}, zonas = null) {
    const resultado = await knex.transaction(async (trx) => {
      const etapa = await this._etapaConTorneo(idEtapa, trx);
      await trx('etapa').where('id_etapa', idEtapa).forUpdate().first();

      const candidatos = await this._candidatos(etapa, trx);
      if (candidatos.length === 0 && etapa.origen_tipo !== 'MANUAL') {
        throw new BusinessError(`No hay equipos para la etapa "${etapa.nombre}"`);
      }

      await this._quitarInstanciasPrevias(etapa, trx);

      const conTerritorio = await this._conTerritorio(candidatos, trx);
      const grupos = zonas
        ? this._zonasManuales(zonas, conTerritorio)
        : await this._agrupar(etapa, conTerritorio, trx);

      for (const grupo of grupos) {
        const directa = this._avanzaDirecto(etapa, grupo.equipos.length);
        const [instancia] = await trx('etapa_instancia')
          .insert({ id_etapa: idEtapa, nombre: grupo.nombre, estado: directa ? ESTADO_FINALIZADA : 'Pendiente' })
          .returning('*');

        if (grupo.territorios.length > 0) {
          await trx('etapa_instancia_territorio').insert(
            grupo.territorios.map((t) => ({ ...t, id_etapa_instancia: instancia.id_etapa_instancia }))
          );
        }
        if (grupo.equipos.length > 0) {
          await trx('instancia_participante').insert(grupo.equipos.map((c) => ({
            id_etapa_instancia: instancia.id_etapa_instancia,
            id_equipo: c.id_equipo,
            id_instancia_origen: c.id_instancia_origen || null,
            posicion_origen: c.posicion_origen || null,
            motivo: c.motivo,
            clasificado: directa,
            motivo_clasificacion: directa ? 'UNICO' : null,
            posicion_final: directa ? 1 : null
          })));
        }
      }

      await trx('etapa').where('id_etapa', idEtapa).update({ estado: 'En Progreso' });
      const cerrada = await this._cerrarEtapaSiCorresponde(etapa, trx);

      return { instancias: grupos.length, equipos: conTerritorio.length, etapa_finalizada: cerrada };
    });

    await bitacoraService.log({
      userId: context.userId, action: 'PREPARAR_ETAPA', entity: 'Etapa', entityId: idEtapa,
      ip: context.ip, userAgent: context.userAgent, detail: resultado
    });
    return resultado;
  }

  async _instanciaCompleta(id, trx = knex) {
    const instancia = await trx('etapa_instancia').where('id_etapa_instancia', id).first();
    if (!instancia) throw new NotFoundError('Instancia no encontrada');
    const etapa = await this._etapaConTorneo(instancia.id_etapa, trx);
    return { instancia, etapa, modalidad: this._modalidad(etapa) };
  }

  async _filasTabla(id, modalidad, trx = knex) {
    const participantes = await trx('instancia_participante as ip')
      .join('equipo as e', 'e.id_equipo', 'ip.id_equipo')
      .join('institucion as i', 'i.id_institucion', 'e.id_institucion')
      .where('ip.id_etapa_instancia', id)
      .select('ip.*', 'e.nombre as equipo_nombre', 'i.nombre as institucion_nombre');

    if (modalidad === 'EVALUACION') {
      const resultados = await trx('presentacion as p')
        .join('v_resultado_presentacion as r', 'r.id_presentacion', 'p.id_presentacion')
        .where('p.id_etapa_instancia', id)
        .where('p.estado', 'FINALIZADA')
        .groupBy('r.id_equipo')
        .select(
          'r.id_equipo',
          trx.raw('round(avg(r.puntaje_promedio), 2) AS puntaje_promedio'),
          trx.raw('round(avg(r.coord_promedio), 2) AS coord_promedio'),
          trx.raw('sum(r.muy_bien_total) AS muy_bien_total'),
          trx.raw('sum(r.regular_total) AS regular_total'),
          trx.raw('count(*) AS presentaciones')
        );
      const porEquipo = new Map(resultados.map((r) => [r.id_equipo, r]));
      return participantes.map((p) => ({ ...p, presentaciones: 0, ...porEquipo.get(p.id_equipo) }));
    }

    const posiciones = await trx('v_posicion_instancia').where('id_etapa_instancia', id);
    const porEquipo = new Map(posiciones.map((r) => [r.id_equipo, r]));
    return participantes.map((p) => {
      const fila = porEquipo.get(p.id_equipo) || {};
      return {
        ...p,
        pj: Number(fila.pj) || 0,
        pg: Number(fila.pg) || 0,
        pe: Number(fila.pe) || 0,
        pp: Number(fila.pp) || 0,
        gf: Number(fila.gf) || 0,
        gc: Number(fila.gc) || 0,
        puntos: Number(fila.puntos) || 0
      };
    });
  }

  async _tabla(id, etapa, modalidad, trx = knex) {
    const filas = await this._filasTabla(id, modalidad, trx);
    return ordenarTabla(filas, { modalidad, criterios: etapa.criterios_desempate });
  }

  async _encuentrosPendientes(id, modalidad, trx = knex) {
    if (modalidad === 'EVALUACION') {
      const fila = await trx('presentacion')
        .where('id_etapa_instancia', id)
        .whereNotIn('estado', ['FINALIZADA', 'CANCELADA'])
        .count('* as n')
        .first();
      return Number(fila.n);
    }
    const fila = await trx('partido')
      .where('id_etapa_instancia', id)
      .whereNot('estado', 'Finalizado')
      .count('* as n')
      .first();
    return Number(fila.n);
  }

  async listarPorTorneo(idTorneo) {
    const torneo = await knex('torneo as t')
      .join('disciplina as d', 'd.id_disciplina', 't.id_disciplina')
      .where('t.id_torneo', idTorneo)
      .select(
        't.id_torneo', 't.nombre', 't.id_disciplina', 'd.nombre as disciplina_nombre', 'd.tipo_competencia',
        'd.puntos_victoria', 'd.puntos_empate', 'd.puntos_derrota',
        knex.raw('(SELECT count(*) FROM posicion p WHERE p.id_torneo = t.id_torneo) AS inscriptos')
      )
      .first();
    if (!torneo) throw new NotFoundError('Torneo no encontrado');

    const etapas = await knex('etapa').where('id_torneo', idTorneo).orderBy('orden');
    const instancias = await knex('etapa_instancia as ei')
      .join('etapa as et', 'et.id_etapa', 'ei.id_etapa')
      .where('et.id_torneo', idTorneo)
      .orderBy('ei.id_etapa_instancia')
      .select(
        'ei.*',
        knex.raw('(SELECT count(*) FROM instancia_participante ip WHERE ip.id_etapa_instancia = ei.id_etapa_instancia) AS participantes'),
        knex.raw('(SELECT count(*) FROM instancia_participante ip WHERE ip.id_etapa_instancia = ei.id_etapa_instancia AND ip.clasificado) AS clasificados'),
        knex.raw(`(
          SELECT string_agg(e.nombre, ', ' ORDER BY e.nombre)
          FROM instancia_participante ip JOIN equipo e ON e.id_equipo = ip.id_equipo
          WHERE ip.id_etapa_instancia = ei.id_etapa_instancia AND ip.clasificado
        ) AS clasificados_nombres`)
      );

    return {
      torneo,
      etapas: etapas.map((e) => ({
        ...e,
        modalidad: torneo.tipo_competencia === 'EVALUACION' ? 'EVALUACION' : (e.tipo || 'LIGA'),
        instancias: instancias.filter((i) => i.id_etapa === e.id_etapa)
      }))
    };
  }

  async detalle(id) {
    const { instancia, etapa, modalidad } = await this._instanciaCompleta(id);
    const tabla = await this._tabla(id, etapa, modalidad);
    const territorios = await knex('etapa_instancia_territorio as t')
      .leftJoin('distrito as d', 'd.id_distrito', 't.id_distrito')
      .leftJoin('region as r', 'r.id_region', 't.id_region')
      .where('t.id_etapa_instancia', id)
      .select(knex.raw('COALESCE(d.nombre, r.nombre) AS nombre'));

    const encuentros = modalidad === 'EVALUACION'
      ? await knex('presentacion as p')
        .leftJoin('presentacion_participante as pp', 'pp.id_presentacion', 'p.id_presentacion')
        .leftJoin('equipo as e', 'e.id_equipo', 'pp.id_equipo')
        .where('p.id_etapa_instancia', id)
        .orderBy('p.orden')
        .select('p.id_presentacion', 'p.orden', 'p.estado', 'e.nombre as equipo_nombre')
      : await knex('partido as p')
        .join('equipo as l', 'l.id_equipo', 'p.id_equipo_local')
        .join('equipo as v', 'v.id_equipo', 'p.id_equipo_visitante')
        .join('v_marcador_partido as m', 'm.id_partido', 'p.id_partido')
        .leftJoin('partido_ronda as pr', 'pr.id_partido', 'p.id_partido')
        .where('p.id_etapa_instancia', id)
        .orderBy(['pr.id_ronda', 'p.id_partido'])
        .select(
          'p.id_partido', 'p.estado', 'p.resultado_cargado', 'pr.id_ronda as ronda',
          'l.nombre as local_nombre', 'v.nombre as visitante_nombre',
          'm.puntos_local', 'm.puntos_visitante'
        );

    const pendientes = await this._encuentrosPendientes(id, modalidad);
    const corte = resolverCorte(tabla, etapa.clasifican_por_instancia);

    return {
      instancia,
      etapa: {
        id_etapa: etapa.id_etapa,
        nombre: etapa.nombre,
        modalidad,
        clasifican_por_instancia: etapa.clasifican_por_instancia,
        criterios_desempate: etapa.criterios_desempate
      },
      territorios: territorios.map((t) => t.nombre),
      tabla,
      encuentros,
      pendientes,
      empate_en_corte: corte.empateEnCorte,
      empatados: corte.empatados.map((f) => f.equipo_nombre)
    };
  }

  async agregarParticipante(id, idEquipo, context = {}) {
    const { instancia, etapa } = await this._instanciaCompleta(id);
    if (instancia.estado === ESTADO_FINALIZADA) {
      throw new BusinessError('La instancia ya está finalizada');
    }
    if (instancia.encuentros_generados) {
      throw new BusinessError('La instancia ya tiene encuentros generados');
    }
    const inscripto = await knex('posicion').where({ id_torneo: etapa.id_torneo, id_equipo: idEquipo }).first();
    if (!inscripto) throw new BusinessError('El equipo no está inscripto en el torneo');

    const enLaEtapa = await knex('instancia_participante as ip')
      .join('etapa_instancia as ei', 'ei.id_etapa_instancia', 'ip.id_etapa_instancia')
      .where('ei.id_etapa', etapa.id_etapa)
      .where('ip.id_equipo', idEquipo)
      .first();
    if (enLaEtapa) throw new BusinessError('El equipo ya participa en esta etapa');

    const [fila] = await knex('instancia_participante')
      .insert({ id_etapa_instancia: id, id_equipo: idEquipo, motivo: 'MANUAL' })
      .returning('*');
    await bitacoraService.log({
      userId: context.userId, action: 'AGREGAR_PARTICIPANTE_INSTANCIA', entity: 'EtapaInstancia', entityId: id,
      ip: context.ip, userAgent: context.userAgent, detail: { id_equipo: idEquipo }
    });
    return fila;
  }

  async generarEncuentros(id, context = {}) {
    const resultado = await knex.transaction(async (trx) => {
      const { instancia, etapa, modalidad } = await this._instanciaCompleta(id, trx);
      await trx('etapa_instancia').where('id_etapa_instancia', id).forUpdate().first();

      if (instancia.encuentros_generados) {
        throw new BusinessError('Esta instancia ya tiene sus encuentros generados');
      }
      if (instancia.estado === ESTADO_FINALIZADA) {
        throw new BusinessError('La instancia ya está finalizada');
      }
      if (modalidad === 'ELIMINACION' || modalidad === 'GRUPOS') {
        throw new BusinessError('En esta versión de prueba solo se pueden generar encuentros de Liga y de Evaluación');
      }

      const equipos = await trx('instancia_participante')
        .where('id_etapa_instancia', id)
        .orderBy('id_equipo')
        .pluck('id_equipo');
      if (equipos.length < 2) {
        throw new BusinessError('Se necesitan al menos 2 equipos para generar encuentros');
      }

      const creados = modalidad === 'EVALUACION'
        ? await this._crearPresentaciones(etapa, id, equipos, trx)
        : await this._crearPartidos(etapa, id, equipos, trx);

      await trx('etapa_instancia').where('id_etapa_instancia', id).update({ encuentros_generados: true, estado: 'En Progreso' });
      return { encuentros: creados, equipos: equipos.length };
    });

    await bitacoraService.log({
      userId: context.userId, action: 'GENERAR_ENCUENTROS_INSTANCIA', entity: 'EtapaInstancia', entityId: id,
      ip: context.ip, userAgent: context.userAgent, detail: resultado
    });
    return resultado;
  }

  async _crearPartidos(etapa, id, equipos, trx) {
    const rondas = fixtureService._roundRobin(equipos);
    let creados = 0;
    for (let indice = 0; indice < rondas.length; indice++) {
      for (const { local, visitante } of rondas[indice]) {
        if (local === null || visitante === null) continue;
        const [partido] = await trx('partido').insert({
          id_torneo: etapa.id_torneo,
          id_etapa: etapa.id_etapa,
          id_etapa_instancia: id,
          id_equipo_local: local,
          id_equipo_visitante: visitante,
          estado: 'Pendiente'
        }).returning('id_partido');
        await trx('partido_ronda').insert({ id_partido: partido.id_partido, id_ronda: indice + 1 });
        creados += 1;
      }
    }
    return creados;
  }

  async _crearPresentaciones(etapa, id, equipos, trx) {
    const maximo = await trx('presentacion').where('id_torneo', etapa.id_torneo).max('orden as m').first();
    let orden = Number(maximo.m) || 0;
    for (let indice = 0; indice < equipos.length; indice++) {
      orden += 1;
      const [presentacion] = await trx('presentacion').insert({
        id_torneo: etapa.id_torneo,
        id_disciplina: etapa.id_disciplina,
        id_etapa: etapa.id_etapa,
        id_etapa_instancia: id,
        orden,
        estado: 'PROGRAMADA'
      }).returning('id_presentacion');
      await trx('presentacion_participante').insert({
        id_presentacion: presentacion.id_presentacion,
        id_equipo: equipos[indice],
        rol: 'GRUPO',
        orden_salida: 1
      });
    }
    return equipos.length;
  }

  async finalizar(id, desempate, context = {}) {
    const resultado = await knex.transaction(async (trx) => {
      const { instancia, etapa, modalidad } = await this._instanciaCompleta(id, trx);
      await trx('etapa_instancia').where('id_etapa_instancia', id).forUpdate().first();

      if (instancia.estado === ESTADO_FINALIZADA) {
        throw new BusinessError('La instancia ya está finalizada');
      }
      if (!instancia.encuentros_generados) {
        throw new BusinessError('La instancia todavía no tiene encuentros generados');
      }
      const pendientes = await this._encuentrosPendientes(id, modalidad, trx);
      if (pendientes > 0) {
        throw new BusinessError(`Faltan ${pendientes} encuentro(s) por terminar`);
      }

      const tabla = await this._tabla(id, etapa, modalidad, trx);
      const corte = resolverConDesempate(tabla, etapa.clasifican_por_instancia, desempate);
      if (!corte.valido) {
        const nombres = corte.empatados.map((f) => f.equipo_nombre).join(', ');
        throw new BusinessError(`Hay un empate que los criterios no resuelven: ${nombres}. Elegí ${corte.cupos} equipo(s) para clasificar.`);
      }

      for (const fila of tabla) {
        await trx('instancia_participante')
          .where('id_instancia_participante', fila.id_instancia_participante)
          .update({ posicion_final: fila.posicion });
      }
      const ids = corte.clasificados.map((f) => f.id_instancia_participante);
      await trx('instancia_participante')
        .whereIn('id_instancia_participante', ids)
        .update({ clasificado: true, motivo_clasificacion: 'POSICION' });
      await trx('etapa_instancia').where('id_etapa_instancia', id).update({ estado: ESTADO_FINALIZADA });

      const etapaFinalizada = await this._cerrarEtapaSiCorresponde(etapa, trx);
      return {
        clasificados: corte.clasificados.map((f) => f.equipo_nombre),
        definido_a_mano: corte.empateEnCorte,
        etapa_finalizada: etapaFinalizada
      };
    });

    await bitacoraService.log({
      userId: context.userId, action: 'FINALIZAR_INSTANCIA', entity: 'EtapaInstancia', entityId: id,
      ip: context.ip, userAgent: context.userAgent, detail: resultado
    });
    return resultado;
  }

  async _cerrarEtapaSiCorresponde(etapa, trx) {
    const abiertas = await trx('etapa_instancia')
      .where('id_etapa', etapa.id_etapa)
      .whereNot('estado', ESTADO_FINALIZADA)
      .count('* as n')
      .first();
    if (Number(abiertas.n) > 0) return false;

    if (etapa.mejores_adicionales > 0) {
      await this._clasificarMejoresAdicionales(etapa, trx);
    }
    await trx('etapa').where('id_etapa', etapa.id_etapa).update({ estado: ESTADO_FINALIZADA });
    return true;
  }

  async _clasificarMejoresAdicionales(etapa, trx) {
    const modalidad = this._modalidad(etapa);
    const instancias = await trx('etapa_instancia').where('id_etapa', etapa.id_etapa).pluck('id_etapa_instancia');
    const resto = [];
    for (const id of instancias) {
      const filas = await this._filasTabla(id, modalidad, trx);
      resto.push(...filas.filter((f) => !f.clasificado));
    }
    const tabla = ordenarTabla(resto, { modalidad, criterios: etapa.criterios_desempate });
    const corte = resolverCorte(tabla, etapa.mejores_adicionales);
    if (corte.empateEnCorte) {
      const nombres = corte.empatados.map((f) => f.equipo_nombre).join(', ');
      throw new BusinessError(`Empate entre los mejores adicionales: ${nombres}. Definí el desempate antes de finalizar.`);
    }
    await trx('instancia_participante')
      .whereIn('id_instancia_participante', corte.clasificados.map((f) => f.id_instancia_participante))
      .update({ clasificado: true, motivo_clasificacion: 'MEJOR_ADICIONAL' });
  }
}

module.exports = new EtapaInstanciaService();
