const fs = require('fs');
const path = require('path');

/**
 * Lee los archivos de `src/routes/*.js` y devuelve la lista de endpoints con el
 * guard de permiso que usan.
 *
 * Hace falta un parser propio, y no un grep, por dos motivos que ya mordieron:
 *
 *  1. Los archivos tienen comentarios que mencionan rutas y guards como
 *     ejemplo (`router.post('/:id/reglamento', authenticate, requireAdminOrAbove,
 *     ...)` dentro del JSDoc de `verificar-contenido`). Un grep cuenta esos
 *     ejemplos como endpoints reales y los guards citados en un comentario
 *     aparecen como si estuvieran en la siguiente ruta.
 *  2. Los guards viven en un array de validadores de varias lineas, asi que la
 *     ruta no termina en la linea donde empieza.
 *
 * Por eso: primero se borran comentarios y contenido de strings (dejando los
 * paths entre comillas simples legibles), despues se buscan las Sentencias
 * `router.<metodo>(` y se empareja el parentesis de cierre contando anidamiento.
 */

/**
 * Sustituye por espacios todo lo que no sea codigo: comentarios de linea, de
 * bloque y el interior de los strings. Conserva la longitud del texto para que
 * los offsets de linea sigan sirviendo, y deja intacto el caracter de apertura
 * de cada string para que el path siga siendo legible.
 */
function sinComentariosYStrings(src) {
  const out = src.split('');
  let i = 0;
  let estado = 'codigo'; // codigo | linea | bloque | simple | doble | acento

  while (i < src.length) {
    const c = src[i];
    const siguiente = src[i + 1];

    if (estado === 'codigo') {
      if (c === '/' && siguiente === '/') { estado = 'linea'; out[i] = ' '; out[i + 1] = ' '; i += 2; continue; }
      if (c === '/' && siguiente === '*') { estado = 'bloque'; out[i] = ' '; out[i + 1] = ' '; i += 2; continue; }
      if (c === "'") { estado = 'simple'; i += 1; continue; }
      if (c === '"') { estado = 'doble'; i += 1; continue; }
      if (c === '`') { estado = 'acento'; i += 1; continue; }
      i += 1; continue;
    }

    if (estado === 'linea') {
      if (c === '\n') { estado = 'codigo'; i += 1; continue; }
      out[i] = ' '; i += 1; continue;
    }

    if (estado === 'bloque') {
      if (c === '*' && siguiente === '/') { estado = 'codigo'; out[i] = ' '; out[i + 1] = ' '; i += 2; continue; }
      if (c !== '\n') out[i] = ' ';
      i += 1; continue;
    }

    // Dentro de un string: se borra el contenido pero se deja el delimitador, y
    // solo se pisan las comillas que cierran (o que escaped), no la de apertura.
    if (c === '\\') { out[i] = ' '; if (siguiente && siguiente !== '\n') out[i + 1] = ' '; i += 2; continue; }
    if ((estado === 'simple' && c === "'") || (estado === 'doble' && c === '"') || (estado === 'acento' && c === '`')) {
      estado = 'codigo'; i += 1; continue;
    }
    if (c !== '\n') out[i] = ' ';
    i += 1;
  }

  return out.join('');
}

/** Devuelve el indice del parentesis que cierra el que abre en `desde`. */
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
 * @returns {{archivo: string, metodo: string, ruta: string, guards: string[], linea: number}[]}
 */
function leerRutas(dirRutas) {
  const archivos = fs.readdirSync(dirRutas).filter((f) => f.endsWith('.js')).sort();
  const rutas = [];

  for (const archivo of archivos) {
    const crudo = fs.readFileSync(path.join(dirRutas, archivo), 'utf8');
    const limpio = sinComentariosYStrings(crudo);
    const patron = /router\.(get|post|put|patch|delete)\s*\(/g;
    let m;

    while ((m = patron.exec(limpio)) !== null) {
      const apertura = m.index + m[0].length - 1;
      const cierre = indiceParenCierre(limpio, apertura);
      if (cierre === -1) continue;

      const argumentos = limpio.slice(apertura + 1, cierre);
      // El path se lee del ORIGINAL: el limpiado vacio los strings, pero mantiene
      // los offsets, asi que el mismo rango sobre el crudo tiene el path real.
      const rutaCruda = crudo.slice(apertura + 1, cierre);
      const comilla = rutaCruda.match(/^\s*['"]([^'"]*)['"]/);
      const ruta = comilla ? comilla[1] : '';
      const linea = limpio.slice(0, m.index).split('\n').length;

      // Todos los identificadores de la lista de argumentos, para poder distinguir
      // un guard de permiso de un middleware cualquiera (`authenticate`, `validate`).
      const identificadores = [...argumentos.matchAll(/(?<![\w.$])([A-Za-z][\w$]*)/g)].map((x) => x[1]);

      rutas.push({ archivo, metodo: m[1].toUpperCase(), ruta, guards: identificadores, linea });
    }
  }

  return rutas;
}

/** Los guards de permiso vigentes: un nombre por concepto, sin alias. */
const GUARDS_PERMISO = [
  'requireSuperAdmin',
  'requireAdminOrAbove',
  'operarPartido',
  'gestionarPresentacion',
  'evaluarPresentacion',
  'gestionarEquipoPropio'
];

/** Guards que existieron y se quitaron en F1.4; no deben reaparecer. */
const GUARDS_RETIRADOS = [
  'requireAdmin',
  'requireEditorOrAbove',
  'requireArbitroOrAdmin',
  'requireJuezOrAdmin'
];

module.exports = {
  sinComentariosYStrings,
  leerRutas,
  GUARDS_PERMISO,
  GUARDS_RETIRADOS
};