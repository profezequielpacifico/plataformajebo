const fs = require('fs');
const path = require('path');

function sinComentariosYStrings(src) {
  const out = src.split('');
  let i = 0;
  let estado = 'codigo';

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

    if (c === '\\') { out[i] = ' '; if (siguiente && siguiente !== '\n') out[i + 1] = ' '; i += 2; continue; }
    if ((estado === 'simple' && c === "'") || (estado === 'doble' && c === '"') || (estado === 'acento' && c === '`')) {
      estado = 'codigo'; i += 1; continue;
    }
    if (c !== '\n') out[i] = ' ';
    i += 1;
  }

  return out.join('');
}

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
      const rutaCruda = crudo.slice(apertura + 1, cierre);
      const comilla = rutaCruda.match(/^\s*['"]([^'"]*)['"]/);
      const ruta = comilla ? comilla[1] : '';
      const linea = limpio.slice(0, m.index).split('\n').length;

      const identificadores = [...argumentos.matchAll(/(?<![\w.$])([A-Za-z][\w$]*)/g)].map((x) => x[1]);

      rutas.push({ archivo, metodo: m[1].toUpperCase(), ruta, guards: identificadores, linea });
    }
  }

  return rutas;
}

const GUARDS_PERMISO = [
  'requireSuperAdmin',
  'requireAdminOrAbove',
  'operarPartido',
  'gestionarPresentacion',
  'evaluarPresentacion',
  'gestionarEquipoPropio'
];

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