const path = require('path');
const fs = require('fs');
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

/**
 * La identidad del que opera sale del token, nunca del request.
 *
 * Esto no es una regla de estilo: es la diferencia entre un permiso y una
 * sugerencia. Cuando el endpoint acepta un `id_usuario`/`id_juez` del cliente,
 * el guard sigue filtrando por rol pero deja de filtrar por QUIÉN, y un usuario
 * con el rol correcto puede apuntar el `id` a otro y leer o escribir lo suyo.
 *
 * Ya pasó una vez: `GET /presentaciones/:id/evaluaciones` aceptaba `?id_juez=` y
 * ganaba sobre el token. El juez 1, que era del jurado y por lo tanto pasaba el
 * filtro, pedía las hojas del juez 2. No había ningún guard roto —el filtro por
 * jurado estaba bien—; lo que estaba mal era de dónde salía el sujeto de la
 * lectura.
 *
 * Con los guards ya centralizados (F1.3-F1.4) subir un endpoint con permiso bien
 * puesto e identidad mal derivada es más fácil que antes: las dos cosas se
 * escriben en archivos distintos y el test de autorización no la ve. Este test es
 * la contraprestación de haber centralizado.
 */

describe('Identidad de persona en validadores de ruta', () => {
  const encontradas = leerIdentidadesDeCliente(DIR_RUTAS);

  it('detecta algo (si no, el lector esta roto y el resto no prueba nada)', () => {
    // Un detector que no encuentra nada pasa todos los `it` siguientes con
    // `for (const x of [])`. Este test es el que avisa de eso.
    //
    // El conteo se hace sobre rutas, no sobre entradas de la lista: un validador
    // compartido aparece una vez por cada ruta que lo usa, que es lo que hace que
    // `staff.*.id_usuario` dé 2 y no 1. Si el número no cierra, o se rompió el
    // lector, o apareció una identidad nueva sin excepción.
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
      // Cada ruta que la excepción declara tiene que seguir existiendo: si el
      // endpoint se renombró o se borró, la excepción es una puerta que ya no está
      // pero que el detector sigue creyendo abierta.
      for (const r of e.rutas) {
        expect(
          encontradas.some((x) => x.archivo === e.archivo && x.campo === e.campo && x.metodo === r.metodo && x.ruta === r.ruta)
        ).toBe(true);
      }
    }
  });

  it('las designaciones permitidas son de cuerpo y bajo el guard que declara su excepción', () => {
    // La categoría admisible sigue siendo una sola: un actor ya autenticado que
    // nombra a quién queda a cargo. Si aparece una tercera excepción de otra
    // clase, este test la señala para que se discuta en vez de colarse por la
    // puerta de atrás de la lista.
    expect(EXCEPCIONES.map((e) => e.campo).sort()).toEqual(['id_usuario', 'staff.*.id_usuario']);

    // El universo de guards admisible vive CERRADO en este archivo: una
    // excepción solo puede declarar guards de esta lista, así que meter
    // `evaluarPresentacion` (que también deja entrar a jueces) obliga a tocar el
    // test, que es exactamente el momento en que la designación se discute.
    //
    // `gestionarEquipoPropio` está porque el alta de equipo (§5 de
    // modelo-roles) vive ahí: el guard también deja entrar al Profesor, pero la
    // designación de `id_usuario` no le hace efecto — `equipo.service.create`
    // fuerza el dueño al propio creador — y la suite `equipo-alta-profesor` lo
    // prueba de extremo a extremo. El guard se declara por excepción, no en
    // global: si `staff.*.id_usuario` apareciera en una ruta bajo otro guard,
    // la intersección con los declarados de esa excepción queda vacía y el
    // fallo señala la ruta, que es donde está el problema.
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
    // La regla es mas fuerte para `query` que para `body` y no por capricho: un
    // `body` puede ser legítimamente una DESIGNACION ("creá este equipo para esta
    // persona", "nombrá a este juez"), mientras que no existe un endpoint legitimo
    // donde una query diga "estas son mis cosas". Un filtro se aplica a datos
    // ajenos, y eso nunca lo escribe el que pregunta.
    //
    // Y sin excepciones: las dos designaciones que hay son de cuerpo, y una
    // designación en query sería un filtro disfrazado de selector.
    const enQuery = encontradas.filter((e) => e.origen === 'query');
    expect(enQuery).toEqual([]);
  });

  it('el comentario que explica el bug de id_juez no cuenta como reintroduccion', () => {
    // El controlador de presentaciones tiene un comentario largo que menciona
    // `?id_juez=` varias veces, y la ruta tiene otro que lo cita. Un grep sin
    // limpiar comentarios los contaria como codigo y el test que deberia
    // documentar la regla la haria fallar siempre.
    const fuente = fs.readFileSync(
      path.join(__dirname, '..', '..', 'src', 'controllers', 'presentacion.controller.js'),
      'utf8'
    );
    expect(fuente).toMatch(/\?id_juez=/);

    expect(leerIdentidadesDeCliente(DIR_RUTAS).filter((e) => e.campo === 'id_juez')).toEqual([]);
  });
});

describe('Identidad de persona leida del request en codigo', () => {
  const encontradas = leerIdentidadesDesdeRequest([DIR_SRC]);

  it('ningun controlador o servicio lee una identidad de req.query o req.body', () => {
    // Esta pasada ve lo que la de validadores no: un endpoint SIN validadores puede
    // leer el body igual de bien, y el `?id_juez=` original no declaraba ningun
    // `query('id_juez')` justamente porque no validaba la query. Era exactamente
    // el caso invisible.
    expect(encontradas).toEqual([]);
  });
});

describe('El detector de identidad', () => {
  // Un detector mal hecho que no detecta nada hace que toda la suite de arriba
  // sea decorativa. Estos casos son los que lo sostienen.
  const casos = [
    ['id_usuario', true],
    ['id_juez', true],
    ['id_arbitro', true],
    ['id_admin', true],
    ['id_usuario_arbitro', true],
    ['id_usuario_juez', true],
    ['id_arbitro_actual', true],
    // Comodines de express-validator: el campo real es el del último segmento.
    ['staff.*.id_usuario', true],
    // Los de recurso: el filtro tiene que dejarlos pasar, o el detector es ruido y
    // la primera excepcion que aparezca va a ser "todo".
    ['id_torneo', false],
    ['id_equipo', false],
    ['id_disciplina', false],
    ['id_localidad', false],
    ['id_participante_equipo', false],
    ['id_institucion', false],
    ['id_disponibilidad', false],
    // Los dos que más tientan a equivocarse: `id_evaluacion` es el documento de la
    // hoja, no quien la escribió, y `id_staff` es el jurado entero, no una persona.
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
    // Con un `includes` en vez de comparar palabras, `juez` matchearía `juzgado` y
    // `admin` matchearía `administrador_local` mal partido. El detector tiene que
    // poder decir "no" sin miedo, o la primera excepción que aparezca va a ser
    // "desactivar el test".
    expect(esCampoIdentidad('id_actualizado_por')).toBe(false);
    expect(esCampoIdentidad('id_documento_actual')).toBe(false);
    expect(esCampoIdentidad('id_equipo_juzgado')).toBe(false);
  });
});