const fs = require('fs');
const path = require('path');

/**
 * Los numeros de documento de las fixtures tienen que ser unicos en toda la
 * suite.
 *
 * Cada suite de integracion arma su usuario con `SELECT ... WHERE documento = $1
 * OR email = $2` y despues `UPDATE` o `DELETE` sobre esa fila, porque borrarla
 * choca con la FK de `bitacora`. Ese patron necesita que el documento sea
 * exclusivo: si dos suites usan el mismo, una actualiza el rol del usuario de la
 * otra y aparecen fallos que no tienen nada que ver con lo que se prueba — un
 * `requireSuperAdmin` que responde 403 porque la otra suite le bajo el rol, o un
 * `DELETE` que revienta por filas de `bitacora` que nadie escribio.
 *
 * Los documentos generados en runtime no entran: son aleatorios por definicion.
 */
const DIR = path.join(__dirname, '..');
const LITERAL = /(?:const\s+)?DOCUMENTO[A-Z_]*\s*=\s*'(\d{6,})'/g;
const EN_EL_CUERPO = /const\s+documento\s*=\s*'(\d{6,})'/g;

describe('Documentos de fixture sin colisiones', () => {
  const usos = new Map();

  const anotar = (archivo, documento, donde) => {
    const lista = usos.get(documento) || [];
    lista.push(`${path.basename(archivo)} (${donde})`);
    usos.set(documento, lista);
  };

  const recorrer = (dir) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const completo = path.join(dir, entrada.name);
      if (entrada.isDirectory()) {
        recorrer(completo);
        continue;
      }
      if (!entrada.name.endsWith('.test.js')) continue;

      const texto = fs.readFileSync(completo, 'utf8');
      for (const patron of [LITERAL, EN_EL_CUERPO]) {
        patron.lastIndex = 0;
        let m;
        while ((m = patron.exec(texto)) !== null) {
          anotar(completo, m[1], `linea ${texto.slice(0, m.index).split('\n').length}`);
        }
      }
    }
  };

  recorrer(DIR);

  it('hay fixtures que revisar', () => {
    // Si el recorrido no encuentra nada, el test pasaria en verde sin comprobar
    // nada y una futura suite con un documento fijo no tendria contra que chocar.
    expect(usos.size).toBeGreaterThan(1);
  });

  it('ningun documento aparece en dos lugares', () => {
    const colisiones = [...usos.entries()]
      .filter(([, lista]) => lista.length > 1)
      .map(([documento, lista]) => `${documento}: ${lista.join(' + ')}`);

    expect(colisiones).toEqual([]);
  });
});