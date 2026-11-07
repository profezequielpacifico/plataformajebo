const path = require('path');
const fs = require('fs');

const { leerRutas, sinComentariosYStrings, GUARDS_PERMISO, GUARDS_RETIRADOS } = require('../helpers/rutas-gates');

const DIR_RUTAS = path.join(__dirname, '..', '..', 'src', 'routes');

const MAPA = [
  ['cancha.routes.js | POST /', 'requireAdminOrAbove'],
  ['cancha.routes.js | PUT /:id', 'requireAdminOrAbove'],
  ['cancha.routes.js | PUT /:id/schedule', 'requireAdminOrAbove'],
  ['cancha.routes.js | DELETE /:id', 'requireAdminOrAbove'],
  ['configuracion_puntaje.routes.js | POST /', 'requireAdminOrAbove'],
  ['configuracion_puntaje.routes.js | PUT /:id', 'requireAdminOrAbove'],
  ['configuracion_puntaje.routes.js | DELETE /:id', 'requireAdminOrAbove'],
  ['disciplina.routes.js | POST /', 'requireAdminOrAbove'],
  ['disciplina.routes.js | POST /:id/reglamento', 'requireAdminOrAbove'],
  ['disciplina.routes.js | PUT /:id', 'requireAdminOrAbove'],
  ['disciplina.routes.js | DELETE /:id', 'requireAdminOrAbove'],
  ['etapa.routes.js | POST /', 'requireAdminOrAbove'],
  ['etapa.routes.js | POST /torneo/:torneoId', 'requireAdminOrAbove'],
  ['etapa.routes.js | PUT /torneo/:torneoId', 'requireAdminOrAbove'],
  ['etapa.routes.js | PUT /:id', 'requireAdminOrAbove'],
  ['etapa.routes.js | DELETE /:id', 'requireAdminOrAbove'],
  ['etapa_instancia.routes.js | GET /torneo/:torneoId', 'requireAdminOrAbove'],
  ['etapa_instancia.routes.js | GET /:id', 'requireAdminOrAbove'],
  ['etapa_instancia.routes.js | POST /etapa/:etapaId/preparar', 'requireAdminOrAbove'],
  ['etapa_instancia.routes.js | POST /:id/encuentros', 'requireAdminOrAbove'],
  ['etapa_instancia.routes.js | POST /:id/participantes', 'requireAdminOrAbove'],
  ['etapa_instancia.routes.js | POST /:id/finalizar', 'requireAdminOrAbove'],
  ['instancia.routes.js | POST /', 'requireAdminOrAbove'],
  ['instancia.routes.js | PUT /:id', 'requireAdminOrAbove'],
  ['instancia.routes.js | DELETE /:id', 'requireAdminOrAbove'],
  ['institucion.routes.js | POST /', 'requireAdminOrAbove'],
  ['institucion.routes.js | PUT /:id', 'requireAdminOrAbove'],
  ['institucion.routes.js | DELETE /:id', 'requireAdminOrAbove'],
  ['torneo.routes.js | POST /', 'requireAdminOrAbove'],
  ['torneo.routes.js | PUT /:id', 'requireAdminOrAbove'],
  ['torneo.routes.js | DELETE /:id', 'requireAdminOrAbove'],
  ['torneo.routes.js | POST /:id/reglamento', 'requireAdminOrAbove'],
  ['partido.routes.js | POST /', 'requireAdminOrAbove'],
  ['partido.routes.js | PUT /:id', 'requireAdminOrAbove'],
  ['partido.routes.js | DELETE /:id', 'requireAdminOrAbove'],
  ['region.routes.js | POST /', 'requireSuperAdmin'],
  ['region.routes.js | PUT /:id', 'requireSuperAdmin'],
  ['region.routes.js | DELETE /:id', 'requireSuperAdmin'],
  ['distrito.routes.js | POST /', 'requireSuperAdmin'],
  ['distrito.routes.js | PUT /:id', 'requireSuperAdmin'],
  ['distrito.routes.js | DELETE /:id', 'requireSuperAdmin'],
  ['localidad.routes.js | POST /', 'requireSuperAdmin'],
  ['localidad.routes.js | PUT /:id', 'requireSuperAdmin'],
  ['localidad.routes.js | DELETE /:id', 'requireSuperAdmin'],
  ['index.js | GET /audit/logs', 'requireSuperAdmin'],
  ['index.js | GET /admin/login-lockouts', 'requireSuperAdmin'],
  ['index.js | DELETE /admin/login-lockouts/:ip', 'requireSuperAdmin'],
  ['index.js | POST /fixture/generate', 'requireAdminOrAbove'],
  ['index.js | GET /fixture/audit', 'requireAdminOrAbove'],
  ['index.js | POST /inscripcion/cerrar-vencidas', 'requireAdminOrAbove'],
  ['competencia.routes.js | POST /', 'requireAdminOrAbove'],
  ['competencia.routes.js | POST /:etapaId/evaluar', 'requireAdminOrAbove'],
  ['competencia.routes.js | POST /:etapaId/generar-participantes', 'requireAdminOrAbove'],
  ['equipo.routes.js | POST /', 'gestionarEquipoPropio'],
  ['equipo.routes.js | POST /enroll-batch', 'gestionarEquipoPropio'],
  ['equipo.routes.js | POST /:id/enroll', 'gestionarEquipoPropio'],
  ['equipo.routes.js | PUT /:id', 'gestionarEquipoPropio'],
  ['equipo.routes.js | DELETE /:id', 'gestionarEquipoPropio'],
  ['partido.routes.js | GET /mios', 'operarPartido'],
  ['partido.routes.js | PATCH /:id/status', 'operarPartido'],
  ['partido.routes.js | PATCH /:id/result', 'operarPartido'],
  ['evento.routes.js | POST /:id/clock', 'operarPartido'],
  ['evento.routes.js | POST /:id/events', 'operarPartido'],
  ['evento.routes.js | PATCH /:id/events/:idEvento/anular', 'operarPartido'],
  ['presentacion.routes.js | POST /', 'gestionarPresentacion'],
  ['presentacion.routes.js | GET /:id', 'gestionarPresentacion'],
  ['presentacion.routes.js | PUT /:id', 'gestionarPresentacion'],
  ['presentacion.routes.js | DELETE /:id', 'gestionarPresentacion'],
  ['presentacion.routes.js | PATCH /:id/estado', 'gestionarPresentacion'],
  ['presentacion.routes.js | GET /:id/resultado', 'gestionarPresentacion'],
  ['presentacion.routes.js | POST /:id/calcular-resultado', 'gestionarPresentacion'],
  ['presentacion.routes.js | GET /:id/validar-cierre', 'gestionarPresentacion'],
  ['presentacion.routes.js | GET /', 'evaluarPresentacion'],
  ['presentacion.routes.js | GET /:id/detalle-evaluacion', 'evaluarPresentacion'],
  ['presentacion.routes.js | POST /:id/evaluaciones', 'evaluarPresentacion'],
  ['presentacion.routes.js | GET /:id/evaluaciones', 'evaluarPresentacion'],
  ['usuario.routes.js | GET /:id', 'requireSuperAdmin'],
  ['usuario.routes.js | GET /', 'requireSuperAdmin'],
  ['usuario.routes.js | GET /opciones', 'requireAdminOrAbove'],
  ['usuario.routes.js | POST /', 'requireAdminOrAbove'],
  ['usuario.routes.js | PUT /:id', 'requireAdminOrAbove'],
  ['usuario.routes.js | DELETE /:id', 'requireAdminOrAbove']
];

const clave = (r) => `${r.archivo} | ${r.metodo} ${r.ruta}`;

const ordenar = (pares) => [...pares].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

describe('mapa de permisos por endpoint (F1.4)', () => {
  const rutas = leerRutas(DIR_RUTAS);
  const conPermiso = rutas.filter((r) => r.guards.some((g) => GUARDS_PERMISO.includes(g)));

  const actual = conPermiso.map((r) => [clave(r), r.guards.filter((g) => GUARDS_PERMISO.includes(g)).join(',')]);

  it('ningun endpoint usa un guard de permiso que no este en la lista', () => {
    const formaDeGuard = /^(require[A-Z]\w*|gestionar\w+|operar\w+|evaluar\w+)$/;
    const sospechosos = [];
    for (const r of rutas) {
      for (const g of r.guards) {
        if (formaDeGuard.test(g) && !GUARDS_PERMISO.includes(g)) sospechosos.push(`${clave(r)} -> ${g}`);
      }
    }
    expect(sospechosos).toEqual([]);
  });

  it('el mapa endpoint -> guard es exactamente el esperado', () => {
    expect(ordenar(actual)).toEqual(ordenar(MAPA));
  });

  it('la distribucion es la documentada', () => {
    const conteo = {};
    for (const [, guards] of actual) {
      for (const g of guards.split(',')) conteo[g] = (conteo[g] || 0) + 1;
    }
    expect(conteo).toEqual({
      requireAdminOrAbove: 45,
      requireSuperAdmin: 14,
      gestionarPresentacion: 8,
      operarPartido: 6,
      evaluarPresentacion: 4,
      gestionarEquipoPropio: 5
    });
    expect(actual.length).toBe(82);
  });

  it('ningun endpoint del mapa perdio su permiso', () => {
    const anotados = new Set(MAPA.map(([k]) => k));
    const sinAnotar = conPermiso.filter((r) => !anotados.has(clave(r))).map(clave);
    expect(sinAnotar).toEqual([]);
  });

  it('los guards retirados no se exportan mas', () => {
    const auth = require('../../src/middleware/auth');
    const barril = require('../../src/middleware');
    for (const g of GUARDS_RETIRADOS) {
      expect(auth[g]).toBeUndefined();
      expect(barril[g]).toBeUndefined();
    }
  });

  it('el rol Editor no existe mas en las constantes', () => {
    const { ROLES } = require('../../src/constants/roles');
    expect(ROLES.EDITOR).toBeUndefined();
    expect(Object.values(ROLES)).not.toContain('Editor');
  });

  it('ningun archivo de src cita un guard retirado', () => {
    const ofensores = [];
    const recorrer = (dir) => {
      for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
        const completo = path.join(dir, entrada.name);
        if (entrada.isDirectory()) { recorrer(completo); continue; }
        if (!entrada.name.endsWith('.js')) continue;
        const limpio = sinComentariosYStrings(fs.readFileSync(completo, 'utf8'));
        for (const g of GUARDS_RETIRADOS) {
          const uso = new RegExp(`(?<![\\w.$])${g}(?![\\w$])`).test(limpio);
          if (uso) ofensores.push(`${completo}: ${g}`);
        }
      }
    };
    recorrer(path.join(__dirname, '..', '..', 'src'));
    expect(ofensores).toEqual([]);
  });
});

describe('el lector de rutas que sostiene el mapa', () => {
  const escribir = (contenido) => {
    const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'jebo-rutas-'));
    fs.writeFileSync(path.join(dir, 'prueba.routes.js'), contenido);
    dirs.push(dir);
    return dir;
  };

  const dirs = [];

  afterEach(() => {
    while (dirs.length > 0) fs.rmSync(dirs.pop(), { recursive: true, force: true });
  });

  it('no cuenta como endpoint una ruta mencionada en un comentario', () => {
    const dir = escribir(`
      // router.post('/falso', authenticate, requireSuperAdmin, controlador)
      /* router.get('/tampoco') */
      router.get('/real', authenticate, controlador);
    `);
    const rutas = leerRutas(dir);
    expect(rutas).toHaveLength(1);
    expect(rutas[0].ruta).toBe('/real');
  });

  it('lee el guard aunque la ruta termine en varias lineas', () => {
    const dir = escribir(`
      router.post('/', authenticate, requireAdminOrAbove, [
        body('nombre').notEmpty(),
        body('rol').optional()
      ], validate, controlador.create);
    `);
    const [ruta] = leerRutas(dir);
    expect(ruta.metodo).toBe('POST');
    expect(ruta.ruta).toBe('/');
    expect(ruta.guards).toContain('requireAdminOrAbove');
  });

  it('no confunde un guard con un middleware de otro nombre', () => {
    const dir = escribir(`
      router.get('/a', authenticate, requireAdminOrAbove, c1);
      router.get('/b', authenticate, validarAdmin, c2);
    `);
    const rutas = leerRutas(dir);
    expect(rutas[0].guards).toContain('requireAdminOrAbove');
    expect(rutas[1].guards).not.toContain('requireAdminOrAbove');
    expect(rutas[1].guards).toContain('validarAdmin');
  });

  it('ignora el path dentro de un string que no es una ruta', () => {
    const dir = escribir(`
      const mensaje = 'router.post(\\'/inventado\\')';
      router.get('/real', authenticate, c1);
    `);
    const rutas = leerRutas(dir);
    expect(rutas).toHaveLength(1);
    expect(rutas[0].ruta).toBe('/real');
  });
});