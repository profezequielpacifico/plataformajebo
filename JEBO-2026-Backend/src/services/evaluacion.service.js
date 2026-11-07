const {
  EvaluacionRepository,
  PresentacionRepository,
  PresentacionParticipanteRepository,
  StaffPresentacionRepository,
  ConfiguracionPuntajeRepository
} = require('../repositories');
const { BusinessError, NotFoundError, ForbiddenError } = require('../utils/errors');
const { ESTADOS_PRESENTACION } = require('../constants');
const bitacoraService = require('./bitacora.service');
const autorizacionService = require('./autorizacion.service');

class EvaluacionService {
  async guardarHoja(data, context = {}) {
    const {
      id_presentacion,
      id_participante_equipo,
      coord_1, desem_1,
      coord_2, desem_2,
      coord_3, desem_3,
      coord_4, desem_4,
      observaciones
    } = data;

    const presentacion = await PresentacionRepository.findById(id_presentacion);
    if (!presentacion) throw new NotFoundError('Presentación no encontrada');

    if (presentacion.estado !== ESTADOS_PRESENTACION.EN_CURSO) {
      throw new BusinessError('Solo se puede evaluar una presentación EN_CURSO');
    }

    const esJuezDelJurado = await autorizacionService.esJuezDelJurado(id_presentacion, context.userId);
    const esAdmin = autorizacionService.esAdministrador(context.rol);
    if (!esJuezDelJurado && !esAdmin) {
      throw new ForbiddenError('No eres juez de esta presentación');
    }

    const participante = await PresentacionParticipanteRepository.findById(id_presentacion, id_participante_equipo);
    if (!participante) throw new NotFoundError('Participante no encontrado en esta presentación');

    const valores = [coord_1, desem_1, coord_2, desem_2, coord_3, desem_3, coord_4, desem_4];
    for (const v of valores) {
      if (v < 1 || v > 5 || !Number.isInteger(v)) {
        throw new BusinessError(`Todos los valores deben ser enteros entre 1 y 5. Recibido: ${v}`);
      }
    }

    const evaluacion = await EvaluacionRepository.upsert({
      id_presentacion,
      id_participante_equipo,
      id_juez: context.userId,
      coord_1, desem_1,
      coord_2, desem_2,
      coord_3, desem_3,
      coord_4, desem_4,
      observaciones,
      actualizado_en: new Date()
    });

    await bitacoraService.log({
      userId: context.userId,
      action: 'GUARDAR_EVALUACION',
      entity: 'Evaluacion',
      entityId: evaluacion.id_evaluacion,
      detail: {
        id_presentacion,
        id_participante_equipo,
        total_coord: coord_1 + coord_2 + coord_3 + coord_4,
        total_desem: desem_1 + desem_2 + desem_3 + desem_4,

        como_admin: esAdmin && !esJuezDelJurado
      },
      ip: context.ip,
      userAgent: context.userAgent
    });

    return evaluacion;
  }

  async getEvaluacionesPorJuez(id_presentacion, id_juez) {
    return EvaluacionRepository.findByJuez(id_juez, id_presentacion);
  }

  async calcularResultado(id_presentacion, context = {}) {
    const presentacion = await PresentacionRepository.findById(id_presentacion);
    if (!presentacion) throw new NotFoundError('Presentación no encontrada');

    if (presentacion.estado !== ESTADOS_PRESENTACION.FINALIZADA &&
        presentacion.estado !== ESTADOS_PRESENTACION.EN_CURSO) {
      throw new BusinessError('La presentación debe estar EN_CURSO o FINALIZADA');
    }

    const resultado = await EvaluacionRepository.resultadoFinal(id_presentacion);

    if (resultado.length === 0) {
      throw new BusinessError('No hay evaluaciones para calcular resultado');
    }

    const incompletos = resultado.filter(r => r.jueces_count < 3);
    if (incompletos.length > 0) {
      throw new BusinessError(`${incompletos.length} participante(s) no tienen evaluaciones de los 3 jueces`);
    }

    await bitacoraService.log({
      userId: context.userId,
      action: 'CALCULAR_RESULTADO_PRESENTACION',
      entity: 'Presentacion',
      entityId: id_presentacion,
      detail: { total_participantes: resultado.length },
      ip: context.ip,
      userAgent: context.userAgent
    });

    return resultado;
  }

  async getTotalesPorJuez(id_presentacion) {
    return EvaluacionRepository.totalesPorJuez(id_presentacion);
  }

  async validarCierre(id_presentacion) {
    const presentacion = await PresentacionRepository.findById(id_presentacion);
    const participantes = await PresentacionParticipanteRepository.findByPresentacion(id_presentacion);
    const jueces = await StaffPresentacionRepository.findJueces(id_presentacion);
    const evaluaciones = await EvaluacionRepository.findByPresentacion(id_presentacion);

    const errores = [];

    if (participantes.length === 0) errores.push('No hay participantes');
    if (jueces.length !== 3) errores.push(`Jueces: ${jueces.length}/3`);

    for (const p of participantes) {
      const evalsP = evaluaciones.filter(e => e.id_equipo === p.id_equipo);
      for (const j of jueces) {
        const tiene = evalsP.find(e => e.id_juez === j.id_usuario);
        if (!tiene) {
          errores.push(`${p.equipo_nombre}: falta evaluación de ${j.nombre}`);
        }
      }
    }

    return {
      valido: errores.length === 0,
      errores,
      participantes: participantes.length,
      jueces: jueces.length
    };
  }
}

module.exports = new EvaluacionService();