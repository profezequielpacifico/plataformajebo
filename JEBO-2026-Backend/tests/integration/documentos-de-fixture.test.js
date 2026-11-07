const fs = require('fs');
const path = require('path');

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
    expect(usos.size).toBeGreaterThan(1);
  });

  it('ningun documento aparece en dos lugares', () => {
    const colisiones = [...usos.entries()]
      .filter(([, lista]) => lista.length > 1)
      .map(([documento, lista]) => `${documento}: ${lista.join(' + ')}`);

    expect(colisiones).toEqual([]);
  });
});