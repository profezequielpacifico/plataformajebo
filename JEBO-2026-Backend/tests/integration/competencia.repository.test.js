const knex = require('../../src/config/knex');
const {
  CompetenciaRepository,
  CompetenciaEtapaRepository,
  EtapaReglaRepository,
  EtapaRestriccionRepository,
  EtapaParticipanteRepository
} = require('../../src/repositories');

describe('Competencia Repositories - Integración', () => {
  let competenciaId;
  let etapaId;
  let equipoId;
  let disciplinaId;
  let institucionId;
  let usuarioId;
  let distritoId;
  const SUFIJO = Date.now();

  beforeAll(async () => {
    // Crear cadena de dependencias completa usando SQL directo
    // Nota: en JEBO, distrito NO tiene id_region (la relación territorial es vía localidad)
    const [distrito] = await knex.raw(
      `INSERT INTO distrito (nombre) VALUES (?) RETURNING id_distrito`,
      [`Test Distrito ${SUFIJO}`]
    ).then(r => r.rows);
    distritoId = distrito.id_distrito;

    const [disciplina] = await knex.raw(
      `INSERT INTO disciplina (nombre, jugadores_por_equipo, tipo_competencia) VALUES (?, 11, 'MARCADOR') RETURNING id_disciplina`,
      [`Test Disciplina ${SUFIJO}`]
    ).then(r => r.rows);
    disciplinaId = disciplina.id_disciplina;

    const [institucion] = await knex.raw(
      `INSERT INTO institucion (nombre, id_distrito) VALUES (?, ?) RETURNING id_institucion`,
      [`Test Institucion ${SUFIJO}`, distritoId]
    ).then(r => r.rows);
    institucionId = institucion.id_institucion;

    // usuario requiere: documento (NOT NULL), token_version (NOT NULL DEFAULT 1)
    const [usuario] = await knex.raw(
      `INSERT INTO usuario (nombre, email, password_hash, id_rol, documento, token_version)
       VALUES (?, ?, 'hash', 1, ?, 1) RETURNING id_usuario`,
      [`Test User ${SUFIJO}`, `test_comp_${SUFIJO}@test.com`, `DOC${SUFIJO}`]
    ).then(r => r.rows);
    usuarioId = usuario.id_usuario;

    // equipo requiere: id_institucion, id_disciplina, id_usuario (todas NOT NULL FK)
    const [equipo] = await knex.raw(
      `INSERT INTO equipo (nombre, colores, id_institucion, id_disciplina, id_usuario)
       VALUES (?, '#000000', ?, ?, ?) RETURNING id_equipo`,
      [`Equipo Test Integration ${SUFIJO}`, institucionId, disciplinaId, usuarioId]
    ).then(r => r.rows);
    equipoId = equipo.id_equipo;
  });

  afterAll(async () => {
    // Limpiar en orden inverso (respetando FKs)
    await knex('etapa_participante').del();
    await knex('etapa_restriccion').del();
    await knex('etapa_regla').del();
    await knex('competencia_etapa').del();
    await knex('competencia').del();
    await knex('equipo').where('id_equipo', equipoId).del();
    await knex('usuario').where('id_usuario', usuarioId).del();
    await knex('institucion').where('id_institucion', institucionId).del();
    await knex('disciplina').where('id_disciplina', disciplinaId).del();
    await knex('distrito').where('id_distrito', distritoId).del();
  });

  describe('CompetenciaRepository', () => {
    it('crea una competencia', async () => {
      const [c] = await CompetenciaRepository.create({
        nombre: 'Test Competencia',
        descripcion: 'Descripción test',
        estado: 'BORRADOR'
      });
      expect(c).toHaveProperty('id_competencia');
      expect(c.nombre).toBe('Test Competencia');
      expect(c.estado).toBe('BORRADOR');
      competenciaId = c.id_competencia;
    });

    it('encuentra por id', async () => {
      const c = await CompetenciaRepository.findById(competenciaId);
      expect(c).not.toBeNull();
      expect(c.nombre).toBe('Test Competencia');
    });

    it('actualiza una competencia', async () => {
      const [c] = await CompetenciaRepository.update(competenciaId, {
        estado: 'CONFIGURADA'
      });
      expect(c.estado).toBe('CONFIGURADA');
    });
  });

  describe('CompetenciaEtapaRepository', () => {
    it('crea una etapa de competencia', async () => {
      const [e] = await CompetenciaEtapaRepository.create({
        id_competencia: competenciaId,
        nombre: 'Etapa Test',
        orden: 1,
        tipo: 'ELIMINACION',
        es_final: false,
        estado: 'BORRADOR'
      });
      expect(e).toHaveProperty('id_competencia_etapa');
      expect(e.nombre).toBe('Etapa Test');
      etapaId = e.id_competencia_etapa;
    });

    it('encuentra etapas por competencia', async () => {
      const etapas = await CompetenciaEtapaRepository.findByCompetencia(competenciaId);
      expect(etapas).toHaveLength(1);
      expect(etapas[0].nombre).toBe('Etapa Test');
    });
  });

  describe('EtapaReglaRepository', () => {
    it('crea una regla', async () => {
      const [r] = await EtapaReglaRepository.create({
        id_competencia_etapa: etapaId,
        tipo: 'COMPETICION',
        configuracion: JSON.stringify({ formato: 'ELIMINACION' }),
        orden: 1,
        activa: true
      });
      expect(r).toHaveProperty('id_etapa_regla');
      expect(r.tipo).toBe('COMPETICION');
    });

    it('encuentra reglas activas por etapa', async () => {
      const reglas = await EtapaReglaRepository.findActivasByEtapa(etapaId);
      expect(reglas).toHaveLength(1);
      expect(reglas[0].tipo).toBe('COMPETICION');
    });
  });

  describe('EtapaRestriccionRepository', () => {
    it('crea una restricción', async () => {
      const [r] = await EtapaRestriccionRepository.create({
        id_competencia_etapa: etapaId,
        tipo: 'REGION',
        operador: 'IGUAL',
        valor_json: JSON.stringify({ region: 'REGION_01' }),
        activo: true
      });
      expect(r).toHaveProperty('id_etapa_restriccion');
      expect(r.tipo).toBe('REGION');
    });
  });

  describe('EtapaParticipanteRepository', () => {
    it('crea un participante', async () => {
      const [p] = await EtapaParticipanteRepository.create({
        id_competencia_etapa: etapaId,
        equipo_id: equipoId,
        motivo: 'WILDCARD',
        orden_insercion: 1
      });
      expect(p).toHaveProperty('id_etapa_participante');
      expect(p.equipo_id).toBe(equipoId);
    });

    it('encuentra participantes por etapa', async () => {
      const participantes = await EtapaParticipanteRepository.findByEtapa(etapaId);
      expect(participantes).toHaveLength(1);
    });

    it('rechaza duplicar equipo en misma etapa', async () => {
      await expect(
        EtapaParticipanteRepository.create({
          id_competencia_etapa: etapaId,
          equipo_id: equipoId,
          motivo: 'WILDCARD',
          orden_insercion: 2
        })
      ).rejects.toThrow();
    });
  });

  describe('Transacciones', () => {
    it('rollback en caso de error', async () => {
      const initialCount = await knex('competencia').count('* as count').first();
      const initialTotal = parseInt(initialCount.count);

      try {
        await knex.transaction(async (trx) => {
          await CompetenciaRepository.createConTrx({
            nombre: 'Test Rollback',
            estado: 'BORRADOR'
          }, trx);
          throw new Error('Error forzado');
        });
      } catch (e) {
        // Esperado
      }

      const finalCount = await knex('competencia').count('* as count').first();
      expect(parseInt(finalCount.count)).toBe(initialTotal);
    });
  });
});
