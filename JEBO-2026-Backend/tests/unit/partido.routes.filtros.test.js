const { validationResult } = require('express-validator');
const router = require('../../src/routes/partido.routes');

const capaListado = router.stack.find((l) => l.route && l.route.path === '/' && l.route.methods.get);
const cadenas = capaListado.route.stack.map((s) => s.handle).filter((fn) => typeof fn.run === 'function');

async function errores(query) {
  const req = { query };
  for (const chain of cadenas) {
    await chain.run(req);
  }
  return validationResult(req).array().map((e) => e.msg);
}

describe('GET /matches — filtros de region y equipos', () => {
  it('acepta region, equipo A y equipo B numericos', async () => {
    expect(await errores({ id_region: '3', id_equipo: '10', id_equipo_rival: '11' })).toEqual([]);
  });

  it('acepta la consulta sin filtros', async () => {
    expect(await errores({})).toEqual([]);
  });

  it('rechaza una region que no es un numero', async () => {
    expect(await errores({ id_region: 'norte' })).toEqual(['Región inválida']);
  });

  it('rechaza un equipo rival en cero', async () => {
    expect(await errores({ id_equipo_rival: '0' })).toEqual(['Equipo inválido']);
  });

  it('rechaza un equipo que no es un numero', async () => {
    expect(await errores({ id_equipo: 'abc' })).toEqual(['Equipo inválido']);
  });
});
