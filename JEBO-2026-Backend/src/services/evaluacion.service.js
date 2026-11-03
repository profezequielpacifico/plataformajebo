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
  /**
   * Guarda/actualiza la hoja de un juez para un participante
   * Valida rangos 1-5 y unicidad juez-participante
   */
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

    // Verificar que el usuario es juez de esta presentación.

    const esJuezDelJurado = await autorizacionService.esJuezDelJurado(id_presentacion, context.userId);
    const esAdmin = autorizacionService.esAdministrador(context.rol);
    if (!esJuezDelJurado && !esAdmin) {
      throw new ForbiddenError('No eres juez de esta presentación');
    }

    const participante = await PresentacionParticipanteRepository.findById(id_presentacion, id_participante_equipo);
    if (!participante) throw new NotFoundError('Participante no encontrado en esta presentación');

    // Validar rangos (1-5)
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
        // Deja asentado si la hoja la cargo el jurado o el admin: sin esto, una

        como_admin: esAdmin && !esJuezDelJurado
      },
      ip: context.ip,
      userAgent: context.userAgent
    });

    return evaluacion;
  }

  /**
   * Obtiene todas las evaluaciones de un juez en una presentación.
   *
   * El `id_juez` lo decide el token, nunca el que pregunta: el unico caller es
   * `presentacion.controller.getEvaluacionesJuez`, que lo saca de `req.user`. Ese
   * metodo recibia antes un `?id_juez=` que ganaba sobre el token, y con el
   * guard ya en su lugar un juez del jurado todavia podia pedir la hoja de otro.
   *
   * `getHoja` se borró en F1.5.3. No tenía ni un caller —ni en `src`, ni en
   * `tests`, ni en `scripts`— y su firma era exactamente la del agujero: un
   * `id_juez` quezejez recibe de parte de quien llama. Código muerto con esa forma
   * es una puerta giratoria: el día que alguien lo cablee a un controlador, el
   * `id_juez` entra desde el body y el problema vuelve sin que nada haya parecido
   * cambiar. Si alguna vez hace falta, tiene que salir de `context.userId`.
   */
  async getEvaluacionesPorJuez(id_presentacion, id_juez) {
    return EvaluacionRepository.findByJuez(id_juez, id_presentacion);
  }

  /**
   * Calcula el resultado final aplicando la fórmula del reglamento
   */
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

  /**
   * Obtiene totales por juez (para verificación)
   */
  async getTotalesPorJuez(id_presentacion) {
    return EvaluacionRepository.totalesPorJuez(id_presentacion);
  }

  /**
   * Valida que se puedan cerrar resultados
   */
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