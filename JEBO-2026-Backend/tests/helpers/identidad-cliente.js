const fs = require('fs');
const path = require('path');
const { sinComentariosYStrings } = require('./rutas-gates');

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

const esCampoIdentidad = (nombre) => {
  const hoja = String(nombre).toLowerCase().split('.').pop().trim();
  const palabras = hoja.replace(/^id_/, '').split('_').filter(Boolean);
  return palabras.some((p) => SUSTANTIVOS_PERSONA.includes(p));
};

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

const esExcepcion = (hallazgo, excepciones = EXCEPCIONES) =>
  excepciones.some(
    (e) =>
      e.archivo === hallazgo.archivo &&
      e.campo === hallazgo.campo &&
      e.rutas.some((r) => r.metodo === hallazgo.metodo && r.ruta === hallazgo.ruta)
  );

function leerIdentidadesDeCliente(dirRutas) {
  const archivos = fs.readdirSync(dirRutas).filter((f) => f.endsWith('.js')).sort();
  const encontradas = [];

  for (const archivo of archivos) {
    const crudo = fs.readFileSync(path.join(dirRutas, archivo), 'utf8');
    const limpio = sinComentariosYStrings(crudo);

    const arraysConNombre = leerArraysDeValidadores(limpio, crudo);

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
        for (const uso of contenedor.usos) {
          encontradas.push({ ...base, metodo: uso.metodo, ruta: uso.ruta });
        }
      } else {
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
        const nombres = [...argumentos.matchAll(/(?<![\w.$])([A-Za-z_$][\w$]*)/g)].map((x) => x[1]);
        if (!nombres.includes(d[1])) return null;

        return { metodo: r[1].toUpperCase(), ruta: rutaDe(crudo, r.index + r[0].length) };
      })
      .filter(Boolean);

    return { nombre: d[1], desde: d.index, hasta: cierre === -1 ? d.index : cierre, usos };
  });
}

const rutaDe = (crudo, desde) => {
  const coma = crudo.indexOf(',', desde);
  const bruto = crudo.slice(desde, coma === -1 ? desde + 80 : coma).match(/^\s*['"]([^'"]*)['"]/);
  return bruto ? bruto[1] : '';
};

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