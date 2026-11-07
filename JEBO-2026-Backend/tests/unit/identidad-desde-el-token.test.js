const path = require('path');
const {
  esCampoIdentidad,
  leerIdentidadesDeCliente,
  leerIdentidadesDesdeRequest,
  EXCEPCIONES
} = require('../helpers/identidad-cliente');
const { leerRutas } = require('../helpers/rutas-gates');

const DIR_RUTAS = path.join(__dirname, '..', '..', 'src', 'routes');
const DIR_SRC = path.join(__dirname, '..', '..', 'src');
const rutas = leerRutas(DIR_RUTAS);

describe('Identidad de persona en validadores de ruta', () => {
  const encontradas = leerIdentidadesDeCliente(DIR_RUTAS);

  it('detecta algo (si no, el lector esta roto y el resto no prueba nada)', () => {
    const esperadas = EXCEPCIONES.reduce((n, e) => n + e.rutas.length, 0);
    expect(encontradas.length).toBe(esperadas);

    for (const e of encontradas) {
      expect(e.excepcion).toBe(true);
    }
  });

  it('todo lo que aparece tiene su excepcion escrita y con motivo', () => {
    const sinMotivo = EXCEPCIONES.filter((e) => !e.motivo || e.motivo.length < 40);
    expect(sinMotivo).toEqual([]);

    const encontradas = leerIdentidadesDeCliente(DIR_RUTAS);
    for (const e of EXCEPCIONES) {
      for (const r of e.rutas) {
        expect(
          encontradas.some((x) => x.archivo === e.archivo && x.campo === e.campo && x.metodo === r.metodo && x.ruta === r.ruta)
        ).toBe(true);
      }
    }
  });

  it('las designaciones permitidas son de cuerpo y bajo el guard que declara su excepción', () => {
    expect(EXCEPCIONES.map((e) => e.campo).sort()).toEqual(['id_usuario', 'staff.*.id_usuario']);

    const GUARDS_DESIGNACION = ['gestionarPresentacion', 'requireAdminOrAbove', 'requireSuperAdmin', 'gestionarEquipoPropio'];

    for (const e of EXCEPCIONES) {
      expect(e.guards.length).toBeGreaterThan(0);
      expect(e.guards.every((g) => GUARDS_DESIGNACION.includes(g))).toBe(true);

      for (const r of e.rutas) {
        const gate = rutas.find((x) => x.archivo === e.archivo && x.metodo === r.metodo && x.ruta === r.ruta);
        expect(gate).toBeDefined();
        expect(gate.guards.filter((g) => e.guards.includes(g))).not.toEqual([]);
      }
    }
  });

  it('ninguna query pide la identidad de quien pregunta', () => {
    const enQuery = encontradas.filter((e) => e.origen === 'query');
    expect(enQuery).toEqual([]);
  });

  it('ninguna ruta lee id_juez del cliente', () => {
    expect(leerIdentidadesDeCliente(DIR_RUTAS).filter((e) => e.campo === 'id_juez')).toEqual([]);
  });
});

describe('Identidad de persona leida del request en codigo', () => {
  const encontradas = leerIdentidadesDesdeRequest([DIR_SRC]);

  it('ningun controlador o servicio lee una identidad de req.query o req.body', () => {
    expect(encontradas).toEqual([]);
  });
});

describe('El detector de identidad', () => {
  const casos = [
    ['id_usuario', true],
    ['id_juez', true],
    ['id_arbitro', true],
    ['id_admin', true],
    ['id_usuario_arbitro', true],
    ['id_usuario_juez', true],
    ['id_arbitro_actual', true],
    ['staff.*.id_usuario', true],
    ['id_torneo', false],
    ['id_equipo', false],
    ['id_disciplina', false],
    ['id_localidad', false],
    ['id_participante_equipo', false],
    ['id_institucion', false],
    ['id_disponibilidad', false],
    ['id_evaluacion', false],
    ['id_staff', false],
    ['id_posicion', false],
    ['id_config', false],
    ['nombre', false],
    ['email', false],
    ['', false]
  ];

  it.each(casos)('clasifica %s como identidad=%s', (campo, esperado) => {
    expect(esCampoIdentidad(campo)).toBe(esperado);
  });

  it('no confunde una palabra que aparece a mitad de otra', () => {
    expect(esCampoIdentidad('id_actualizado_por')).toBe(false);
    expect(esCampoIdentidad('id_documento_actual')).toBe(false);
    expect(esCampoIdentidad('id_equipo_juzgado')).toBe(false);
  });
});