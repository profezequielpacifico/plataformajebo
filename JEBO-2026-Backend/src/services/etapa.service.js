const { EtapaRepository } = require('../repositories');
const { NotFoundError, BusinessError } = require('../utils/errors');
const bitacoraService = require('./bitacora.service');
const knex = require('../config/knex');

const AMBITOS = ['DISTRITO', 'REGION', 'INTERREGIONAL', 'NACIONAL', 'PERSONALIZADO'];
const ORIGENES = ['INSCRIPCION', 'ETAPA', 'MANUAL'];
const MODALIDADES = ['LIGA', 'ELIMINACION', 'GRUPOS', 'EVALUACION'];
const CRITERIOS = ['PUNTOS', 'DIFERENCIA', 'A_FAVOR'];

const enteroOpcional = (valor) => (valor === undefined || valor === null || valor === '' ? null : Number(valor));

const reglasDeEtapa = (e) => ({
  ambito: e.ambito || 'PERSONALIZADO',
  origen_tipo: e.origen_tipo || 'INSCRIPCION',
  origen_ambito: e.origen_ambito || null,
  id_etapa_origen: enteroOpcional(e.id_etapa_origen),
  clasifican_por_instancia: enteroOpcional(e.clasifican_por_instancia) ?? 1,
  mejores_adicionales: enteroOpcional(e.mejores_adicionales) ?? 0,
  territorios_por_instancia: enteroOpcional(e.territorios_por_instancia),
  avanza_si_unico: e.avanza_si_unico !== false,
  criterios_desempate: JSON.stringify(e.criterios_desempate || CRITERIOS)
});

class EtapaService {
  async findAll(id_torneo) {
    return EtapaRepository.findAll(id_torneo);
  }

  async findById(id) {
    const e = await EtapaRepository.findById(id);
    if (!e) throw new NotFoundError('Etapa no encontrada');
    return e;
  }

  _validateEtapas(etapas, torneoFechas = {}) {
    if (!Array.isArray(etapas) || etapas.length === 0) {
      throw new BusinessError('Debe proporcionar al menos una etapa');
    }
    etapas.forEach((etapa, i) => this._validateEtapa(etapa, i + 1, torneoFechas));
    this._assertNoOverlaps(etapas);
  }

  _validateEtapa(etapa, index, torneoFechas) {
    if (!etapa.nombre || !etapa.nombre.trim()) {
      throw new BusinessError(`Etapa ${index}: el nombre es requerido`);
    }
    if (etapa.fecha_inicio && etapa.fecha_fin && etapa.fecha_fin < etapa.fecha_inicio) {
      throw new BusinessError(`Etapa "${etapa.nombre}": la fecha de fin debe ser posterior a la de inicio`);
    }
    if (torneoFechas.fecha_inicio && etapa.fecha_inicio && etapa.fecha_inicio < torneoFechas.fecha_inicio) {
      throw new BusinessError(`Etapa "${etapa.nombre}": la fecha de inicio no puede ser anterior a la del torneo`);
    }
    if (torneoFechas.fecha_fin && etapa.fecha_fin && etapa.fecha_fin > torneoFechas.fecha_fin) {
      throw new BusinessError(`Etapa "${etapa.nombre}": la fecha de fin no puede ser posterior a la del torneo`);
    }
    this._validateReglas(etapa);
  }

  _validateReglas(etapa) {
    const nombre = etapa.nombre;
    if (etapa.ambito && !AMBITOS.includes(etapa.ambito)) {
      throw new BusinessError(`Etapa "${nombre}": ámbito inválido`);
    }
    if (etapa.origen_ambito && !AMBITOS.includes(etapa.origen_ambito)) {
      throw new BusinessError(`Etapa "${nombre}": ámbito de origen inválido`);
    }
    if (etapa.origen_tipo && !ORIGENES.includes(etapa.origen_tipo)) {
      throw new BusinessError(`Etapa "${nombre}": origen de equipos inválido`);
    }
    if (etapa.tipo && !MODALIDADES.includes(etapa.tipo)) {
      throw new BusinessError(`Etapa "${nombre}": modalidad inválida`);
    }
    for (const campo of ['clasifican_por_instancia', 'mejores_adicionales', 'territorios_por_instancia']) {
      const valor = enteroOpcional(etapa[campo]);
      const minimo = campo === 'mejores_adicionales' ? 0 : 1;
      if (valor !== null && (!Number.isInteger(valor) || valor < minimo)) {
        throw new BusinessError(`Etapa "${nombre}": el valor de ${campo} es inválido`);
      }
    }
    const criterios = etapa.criterios_desempate;
    if (criterios !== undefined && criterios !== null) {
      if (!Array.isArray(criterios) || criterios.length === 0 || criterios.some((c) => !CRITERIOS.includes(c))) {
        throw new BusinessError(`Etapa "${nombre}": criterios de desempate inválidos`);
      }
    }
  }

  _assertNoOverlaps(etapas) {
    for (let i = 0; i < etapas.length; i++) {
      for (let j = i + 1; j < etapas.length; j++) {
        this._assertNoOverlap(etapas[i], etapas[j]);
      }
    }
  }

  _assertNoOverlap(a, b) {
    if (a.fecha_inicio && a.fecha_fin && b.fecha_inicio && b.fecha_fin) {
      if (!(a.fecha_fin < b.fecha_inicio || b.fecha_fin < a.fecha_inicio)) {
        throw new BusinessError(`Etapas "${a.nombre}" y "${b.nombre}" tienen fechas superpuestas`);
      }
    }
  }

  async createForTorneo(id_torneo, etapas, torneoFechas = {}, context = {}) {
    this._validateEtapas(etapas, torneoFechas);
    const items = etapas.map((e, idx) => ({
      id_torneo,
      nombre: e.nombre.trim(),
      descripcion: e.descripcion || null,
      orden: e.orden || idx + 1,
      fecha_inicio: e.fecha_inicio || null,
      fecha_fin: e.fecha_fin || null,
      estado: e.estado || 'Pendiente',
      tipo: e.tipo || null,
      es_final: e.es_final || false,
      ...reglasDeEtapa(e)
    }));
    const result = await EtapaRepository.createMany(items);
    await bitacoraService.log({
      userId: context.userId, action: 'CREAR_ETAPA', entity: 'Etapa',
      entityId: id_torneo, ip: context.ip, userAgent: context.userAgent,
      detalle: JSON.stringify({ cantidad: result.length, id_torneo })
    });
    return result;
  }

  async syncForTorneo(id_torneo, etapas, torneoFechas = {}, context = {}) {
    this._validateEtapas(etapas, torneoFechas);

    return await knex.transaction(async (trx) => {
      const etapasActuales = await EtapaRepository.findPorTorneoConBloqueo(id_torneo, trx);
      const etapasActualesMap = new Map(etapasActuales.map(e => [e.id_etapa, e]));

      for (const etapa of etapas) {
        if (etapa.id_etapa !== undefined && etapa.id_etapa !== null) {
          const existente = etapasActualesMap.get(etapa.id_etapa);
          if (!existente) {
            throw new BusinessError(`La etapa con id ${etapa.id_etapa} no existe o no pertenece a este torneo`);
          }
        }
      }

      const idsRecibidos = new Set(
        etapas.filter(e => e.id_etapa !== undefined && e.id_etapa !== null).map(e => e.id_etapa)
      );
      const etapasOmitidas = etapasActuales.filter(e => !idsRecibidos.has(e.id_etapa));

      for (const etapa of etapasOmitidas) {
        if (etapa.estado === 'En Progreso' || etapa.estado === 'Finalizada') {
          throw new BusinessError(
            `No se puede eliminar la etapa "${etapa.nombre}" porque está ${etapa.estado}. ` +
            `Finalícela o cancélela antes de eliminarla.`
          );
        }

        const [partidos, posiciones, presentaciones] = await Promise.all([
          EtapaRepository.countPartidos(etapa.id_etapa, trx),
          EtapaRepository.countPosiciones(etapa.id_etapa, trx),
          EtapaRepository.countPresentaciones(etapa.id_etapa, trx)
        ]);

        const deps = [];
        if (parseInt(partidos.count) > 0) deps.push(`${partidos.count} partido(s)`);
        if (parseInt(posiciones.count) > 0) deps.push(`${posiciones.count} posición(es)`);
        if (parseInt(presentaciones.count) > 0) deps.push(`${presentaciones.count} presentación(es)`);

        if (deps.length > 0) {
          throw new BusinessError(
            `No se puede eliminar la etapa "${etapa.nombre}" porque tiene dependencias: ${deps.join(', ')}. ` +
            `Elimine primero las dependencias asociadas.`
          );
        }
      }

      const resultados = [];

      for (let idx = 0; idx < etapas.length; idx++) {
        const etapa = etapas[idx];
        const datosEtapa = {
          nombre: etapa.nombre.trim(),
          descripcion: etapa.descripcion || null,
          orden: etapa.orden || idx + 1,
          fecha_inicio: etapa.fecha_inicio || null,
          fecha_fin: etapa.fecha_fin || null,
          estado: etapa.estado || 'Pendiente',
          tipo: etapa.tipo || null,
          es_final: etapa.es_final || false,
          ...reglasDeEtapa(etapa)
        };

        if (etapa.id_etapa !== undefined && etapa.id_etapa !== null) {
          const actualizada = await EtapaRepository.updateConTrx(etapa.id_etapa, datosEtapa, trx);
          resultados.push(actualizada[0]);
        } else {
          const nueva = await EtapaRepository.createManyConTrx([{
            ...datosEtapa,
            id_torneo
          }], trx);
          resultados.push(nueva[0]);
        }
      }

      for (const etapa of etapasOmitidas) {
        await EtapaRepository.deleteConTrx(etapa.id_etapa, trx);
      }

      await bitacoraService.log({
        userId: context.userId, action: 'ACTUALIZAR_ETAPA', entity: 'Etapa',
        entityId: id_torneo, ip: context.ip, userAgent: context.userAgent,
        detalle: JSON.stringify({
          cantidad: resultados.length,
          id_torneo,
          actualizadas: etapas.filter(e => e.id_etapa !== undefined && e.id_etapa !== null).length,
          nuevas: etapas.filter(e => e.id_etapa === undefined || e.id_etapa === null).length,
          eliminadas: etapasOmitidas.length
        })
      });

      return resultados;
    });
  }

  async create(data, context = {}) {
    const result = await EtapaRepository.create(data);
    await bitacoraService.log({
      userId: context.userId, action: 'CREAR_ETAPA', entity: 'Etapa',
      entityId: result.id_etapa, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async update(id, data, context = {}) {
    await this.findById(id);
    const result = await EtapaRepository.update(id, data);
    await bitacoraService.log({
      userId: context.userId, action: 'ACTUALIZAR_ETAPA', entity: 'Etapa',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async delete(id, context = {}) {
    await this.findById(id);
    const result = await EtapaRepository.delete(id);
    await bitacoraService.log({
      userId: context.userId, action: 'ELIMINAR_ETAPA', entity: 'Etapa',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }
}

module.exports = new EtapaService();
