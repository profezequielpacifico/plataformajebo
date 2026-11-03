const fs = require('fs');
const path = require('path');
const { sinComentariosYStrings } = require('./rutas-gates');

/**
 * Detecta endpoints que dejan que el cliente diga QUIEN es el que opera.
 *
 * El agujero de `?id_juez=` en `GET /presentaciones/:id/evaluaciones` (F1.5.3) no
 * fue un descuido de un endpoint: es la forma que toma el error cuando la
 * identidad vive en el request en vez de en el token. El guard filtra por nivel y
 * por jurado, y un juez que ES del jurado pasa de sobra —después elige de quién
 * quiere ver la hoja—. Un filtro de autorización que depende de un campo que
 * manda el cliente no es un filtro.
 *
 * Con los guards centralizados en `autorizacion.service` (F1.3-F1.4) es más fácil
 * que nunca subir un endpoint nuevo con un permiso bien puesto y una identidad
 * mal derivada, porque las dos cosas se escriben en archivos distintos. Por eso
 * la regla queda con un test que la mira, y no en la cabeza de quien la escribió.
 *
 * La diferencia entre un `id_*` de recurso y uno de identidad es lo que hace el
 * filtro útil en vez de ruido: `id_torneo`, `id_equipo` o `id_disciplina` dicen
 * sobre QUÉ se opera; `id_juez` o `id_usuario` dicen QUIÉN. Las primeras van en
 * query sin problema; las segundas solo pueden aparecer en un body, y únicamente
 * cuando el actor autenticado está DESIGNANDO quién queda a cargo de algo.
 */

/**
 * Sustantivos que nombran a una persona, y por lo tanto nunca deben entrar por
 * query ni por body en un endpoint de lectura o de escritura sobre datos ajenos.
 *
 * No es una lista de campos exactos sino de palabras, porque el patrón importa
 * más que el inventario: `id_usuario_juez` y `id_arbitro_actual` tienen que caer
 * igual que `id_usuario` y `id_arbitro`. La lista se contrastó contra las columnas
 * `id_*` reales de la base para no inventar ni dejar pasar:
 *
 *   identidad  -> id_juez, id_usuario, id_usuario_arbitro, id_usuario_institucion
 *   recurso   -> id_torneo, id_equipo, id_evaluacion, id_staff, id_posicion, ...
 *
 * `id_evaluacion` y `id_staff` son los dos que más tientan a equivocarse: el
 * primero parece una persona ("el que evalúa") y es un documento; el segundo es
 * el conjunto del jurado y no una persona. Ninguno de los dos está en la lista.
 */
const SUSTANTIVOS_PERSONA = [
  'usuario',
  'juez',
  'arbitro',
  'admin',
  'administrador',
  'evaluador',
  'profesor',
  'entrenador',
  'coach',
  'secretario',
  'jefe',
  'empleado'
];

/**
 * Nombre de campo → identidad?
 *
 * Se comparan PALABRAS separadas por `_`, no el final de la cadena: con un
 * `endsWith`, `id_arbitro_actual` se escapa (termina en "actual") y
 * `id_documento_actual` no se escapa (contiene "actual"). Con palabras, el
 * primero cae porque trae "arbitro" y el segundo no porque no trae ninguna de
 * las de la lista.
 *
 * También se queda con el último segmento del path: las rutas de express-validator
 * usan comodines (`staff.*.id_usuario`), y el campo real es el del final.
 */
const esCampoIdentidad = (nombre) => {
  const hoja = String(nombre).toLowerCase().split('.').pop().trim();
  const palabras = hoja.replace(/^id_/, '').split('_').filter(Boolean);
  return palabras.some((p) => SUSTANTIVOS_PERSONA.includes(p));
};

/**
 * Los dos casos en que un `id_` de persona SÍ viene del cliente, con el motivo
 * escrito. Un caso sin motivo escrito acá es un agujero con visibilidad.
 *
 * Los dos son la misma cosa: un actor ya autenticado que designa quién queda a
 * cargo de algo. No es "decime mis cosas" sino "nombrá a esta persona", y quien
 * lo pide ya está autenticado con permiso sobre el recurso. La lista es corta a
 * propósito —agregar una entrada tiene que costar, y por eso hay que explicar
 * por qué—.
 *
 * `guards` es el guard (o los guards) bajo los cuales esa designación es
 * legítima: si la ruta cambia de guard sin que la excepción se entere, la
 * intersección queda vacía y el test falla en la ruta, que es donde está el
 * problema. El universo admisible de guards no vive acá: vive en el test, cerrado.
 *
 * `rutas` es una lista y no un par único porque los validadores viven en arrays
 * compartidos: `validarPresentacion` está en el alta y en la edición, y el body's
 * `staff` se usa en las dos. Acotar la excepción al alta habría hecho fallar el
 * test por un.feature en vez de por un agujero, que es la forma de que un test
 * mecánico termine ignorado.
 */
const EXCEPCIONES = [
  {
    archivo: 'equipo.routes.js',
    rutas: [{ metodo: 'POST', ruta: '/' }],
    campo: 'id_usuario',
    guards: ['gestionarEquipoPropio'],
    motivo:
      'Alta de equipo: el Administrador designa quién es el dueño. Sin esta propiedad, ' +
      'el dueño sería siempre el que hizo el POST y no habría forma de registrar un ' +
      'equipo a nombre del entrenador que lo va a manejar. El guard es ' +
      '`gestionarEquipoPropio` (§5 de modelo-roles) porque desde ahí también da de alta ' +
      'un Profesor, y para él la designación no le hace efecto: ' +
      '`equipo.service.create` fuerza `id_usuario` al propio creador. Las dos caras ' +
      'las prueba la suite `equipo-alta-profesor` de extremo a extremo.'
  },
  {
    archivo: 'presentacion.routes.js',
    rutas: [
      { metodo: 'POST', ruta: '/' },
      { metodo: 'PUT', ruta: '/:id' }
    ],
    campo: 'staff.*.id_usuario',
    guards: ['gestionarPresentacion'],
    motivo:
      'Alta y edición de presentación: el Administrador nombra (o renombra) al jurado. ' +
      'Es una designación de la misma clase que la del dueño del equipo, bajo el mismo ' +
      'guard `gestionarPresentacion`. En el PUT el servicio borra y reescribe ' +
      '`staff_presentacion` a propósito, así que el campo es un parámetro real de la ' +
      'operación, no un sobrante del array de validadores compartido.'
  }
];

/** ¿Esta declaración está cubierta por una excepción? */
const esExcepcion = (hallazgo, excepciones = EXCEPCIONES) =>
  excepciones.some(
    (e) =>
      e.archivo === hallazgo.archivo &&
      e.campo === hallazgo.campo &&
      e.rutas.some((r) => r.metodo === hallazgo.metodo && r.ruta === hallazgo.ruta)
  );

/**
 * Recorre `src/routes/*.js` y devuelve toda declaración `query('...')` o
 * `body('...')` cuyo campo sea de identidad.
 *
 * Se lee el archivo ya limpio de comentarios y strings (`sinComentariosYStrings`)
 * para no contar lo que un comentario menciona: el código de F1.5.3 explica en
 * prosa larga por qué `?id_juez=` no debe volver, y un grep sin limpiar contaría
 * esas líneas como una reimplantación del bug.
 *
 * Hay dos formas de declarar validadores y las dos se atribuyen a una ruta:
 *
 *  1. En línea, dentro del `router.post('/', authenticate, [ body(...) ])`. La
 *     ruta es la sentencia `router.*` más cercana hacia atrás.
 *  2. En un array con nombre (`const validarAlta = [ ... ]`) que la ruta referencia
 *     después como un argumento más. Acá la ruta NO se puede suponer: hay que
 *     buscar qué rutas mencionan el nombre del array.
 *
 * El segundo caso es real y no hipotético: `staff.*.id_usuario` vive en
 * `validarPresentacion`, que se usa en el alta y en la edición. Sin resolverlo, la
 * excepción "esta designación está permitida en el alta" sería una afirmación que
 * el test no verifica, y una excepción que no se verifica es una puerta giratoria.
 *
 * @returns {{archivo: string, origen: string, campo: string, metodo: ?string, ruta: ?string, linea: number, excepcion: boolean}[]}
 */
function leerIdentidadesDeCliente(dirRutas) {
  const archivos = fs.readdirSync(dirRutas).filter((f) => f.endsWith('.js')).sort();
  const encontradas = [];

  for (const archivo of archivos) {
    const crudo = fs.readFileSync(path.join(dirRutas, archivo), 'utf8');
    const limpio = sinComentariosYStrings(crudo);

    // --- pasada 1: los arrays de validadores con nombre y qué rutas los usan ---
    const arraysConNombre = leerArraysDeValidadores(limpio, crudo);

    // --- pasada 2: toda declaración de campo de identidad ---
    const patron = /\b(query|body)\s*\(\s*'/g;
    let m;

    while ((m = patron.exec(limpio)) !== null) {
      const apertura = m.index + m[0].length - 1;
      const cierre = crudo.indexOf("'", apertura + 1);
      if (cierre === -1) continue;

      const campo = crudo.slice(apertura + 1, cierre);
      if (!esCampoIdentidad(campo)) continue;

      const base = {
        archivo,
        origen: m[1],
        campo,
        linea: limpio.slice(0, m.index).split('\n').length
      };

      const contenedor = arraysConNombre.find((a) => m.index >= a.desde && m.index <= a.hasta);

      if (contenedor) {
        // El campo está en un array con nombre: se atribuye a cada ruta que lo use.
        // Un mismo array puede estar en varias rutas y eso es justamente lo
        // interesting: es la razón por la que la excepción tiene que decir en
        // cuál de ellas se permite.
        for (const uso of contenedor.usos) {
          encontradas.push({ ...base, metodo: uso.metodo, ruta: uso.ruta });
        }
      } else {
        // Declaración suelta: la ruta es la sentencia `router.*` más cercana hacia
        // atrás.
        const antes = limpio.slice(0, m.index);
        const previas = [...antes.matchAll(/router\.(get|post|put|patch|delete)\s*\(/g)];
        const previa = previas[previas.length - 1];

        encontradas.push({
          ...base,
          metodo: previa ? previa[1].toUpperCase() : null,
          ruta: previa ? rutaDe(crudo, previa.index + previa[0].length) : null
        });
      }
    }
  }

  return encontradas.map((h) => ({ ...h, excepcion: esExcepcion(h) }));
}

/**
 * Localiza `const <nombre> = [ ... ]` y las rutas que los referencian.
 *
 * Los identificadores de la lista de argumentos de cada `router.*` se leen del
 * texto limpio, así que `validarAlta` se reconoce sin desambiguar nada. Los paths
 * se leen del original por la misma razón que en `leerRutas`: el limpiado vacía
 * los strings pero conserva los offsets.
 */
function leerArraysDeValidadores(limpio, crudo) {
  const declaraciones = [...limpio.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*\[/g)];

  return declaraciones.map((d) => {
    const apertura = d.index + d[0].length - 1;
    const cierre = indiceCorcheteCierre(limpio, apertura);

    const usos = [...limpio.matchAll(/router\.(get|post|put|patch|delete)\s*\(/g)]
      .map((r) => {
        const rApertura = r.index + r[0].length - 1;
        const rCierre = indiceParenCierre(limpio, rApertura);
        if (rCierre === -1) return null;

        const argumentos = limpio.slice(rApertura + 1, rCierre);
        // Identificadores "sueltos": ni precedidos por punto ni por `$`.
        const nombres = [...argumentos.matchAll(/(?<![\w.$])([A-Za-z_$][\w$]*)/g)].map((x) => x[1]);
        if (!nombres.includes(d[1])) return null;

        return { metodo: r[1].toUpperCase(), ruta: rutaDe(crudo, r.index + r[0].length) };
      })
      .filter(Boolean);

    return { nombre: d[1], desde: d.index, hasta: cierre === -1 ? d.index : cierre, usos };
  });
}

/** El path de una sentencia `router.*`, leído sobre el archivo original. */
const rutaDe = (crudo, desde) => {
  const coma = crudo.indexOf(',', desde);
  const bruto = crudo.slice(desde, coma === -1 ? desde + 80 : coma).match(/^\s*['"]([^'"]*)['"]/);
  return bruto ? bruto[1] : '';
};

/** Índice del corchete que cierra el que abre en `desde`. */
function indiceCorcheteCierre(texto, desde) {
  let profundidad = 0;
  for (let i = desde; i < texto.length; i += 1) {
    if (texto[i] === '[') profundidad += 1;
    else if (texto[i] === ']') {
      profundidad -= 1;
      if (profundidad === 0) return i;
    }
  }
  return -1;
}

/** Índice del paréntesis que cierra el que abre en `desde`. */
function indiceParenCierre(texto, desde) {
  let profundidad = 0;
  for (let i = desde; i < texto.length; i += 1) {
    if (texto[i] === '(') profundidad += 1;
    else if (texto[i] === ')') {
      profundidad -= 1;
      if (profundidad === 0) return i;
    }
  }
  return -1;
}

/**
 * Lecturas de identidad directo del request en controladores y servicios.
 *
 * `req.query.id_juez` no necesita pasar por un validador para ser un agujero: el
 * validador es lo que lo hace visible en la ruta, y un endpoint sin validadores
 * puede leer el body igual. Esta segunda pasada cubre el caso que la primera no
 * ve, que es exactamente el del `?id_juez=` original: el endpoint no declaraba
 * ningún `query('id_juez')` porque no validaba la query.
 *
 * Se recorren `src/controllers` y `src/services` y no todo `src`: en
 * `src/repositories`, `id_usuario` es una columna de la fila que se está
 * guardando —el `id_juez` de una hoja, por ejemplo—, no una entrada del cliente.
 */
function leerIdentidadesDesdeRequest(directorios) {
  const encontradas = [];

  const recorrer = (dir) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const completo = path.join(dir, entrada.name);
      if (entrada.isDirectory()) {
        recorrer(completo);
        continue;
      }
      if (!entrada.name.endsWith('.js')) continue;

      const crudo = fs.readFileSync(completo, 'utf8');
      const limpio = sinComentariosYStrings(crudo);
      const patron = /req\.(query|body)\.([A-Za-z_][\w]*)/g;
      let m;

      while ((m = patron.exec(limpio)) !== null) {
        if (!esCampoIdentidad(m[2])) continue;
        encontradas.push({
          archivo: path.relative(process.cwd(), completo),
          origen: `req.${m[1]}`,
          campo: m[2],
          linea: limpio.slice(0, m.index).split('\n').length
        });
      }
    }
  };

  directorios.forEach(recorrer);
  return encontradas;
}

module.exports = {
  esCampoIdentidad,
  esExcepcion,
  leerIdentidadesDeCliente,
  leerIdentidadesDesdeRequest,
  EXCEPCIONES,
  SUSTANTIVOS_PERSONA
};