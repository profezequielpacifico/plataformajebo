const { ordenarTabla, resolverCorte, resolverConDesempate, repartirEnZonas, criteriosValidos } = require('../../src/services/tabla-instancia');

const fila = (id_equipo, puntos, gf = 0, gc = 0) => ({ id_equipo, puntos, gf, gc });

describe('ordenarTabla', () => {
  it('ordena por puntos, diferencia y goles a favor', () => {
    const tabla = ordenarTabla([fila(1, 4, 2, 2), fila(2, 4, 5, 1), fila(3, 6, 1, 0), fila(4, 4, 6, 2)]);
    expect(tabla.map((f) => f.id_equipo)).toEqual([3, 4, 2, 1]);
    expect(tabla.map((f) => f.posicion)).toEqual([1, 2, 3, 4]);
  });

  it('respeta el orden de criterios configurado', () => {
    const tabla = ordenarTabla([fila(1, 6, 1, 0), fila(2, 4, 9, 0)], { criterios: ['A_FAVOR', 'PUNTOS'] });
    expect(tabla[0].id_equipo).toBe(2);
  });

  it('marca el empate cuando los criterios se agotan y comparte la posición', () => {
    const tabla = ordenarTabla([fila(1, 3, 2, 2), fila(2, 3, 2, 2), fila(3, 1, 0, 3)]);
    expect(tabla.map((f) => f.posicion)).toEqual([1, 1, 3]);
    expect(tabla.map((f) => f.empatado)).toEqual([true, true, false]);
  });

  it('en evaluación ordena por puntaje y desempata por coordinación, muy bien y menos regular', () => {
    const tabla = ordenarTabla([
      { id_equipo: 1, puntaje_promedio: 30, coord_promedio: 15, muy_bien_total: 4, regular_total: 2 },
      { id_equipo: 2, puntaje_promedio: 30, coord_promedio: 16, muy_bien_total: 1, regular_total: 9 },
      { id_equipo: 3, puntaje_promedio: 30, coord_promedio: 15, muy_bien_total: 4, regular_total: 1 },
      { id_equipo: 4, puntaje_promedio: 35, coord_promedio: 1, muy_bien_total: 0, regular_total: 0 }
    ], { modalidad: 'EVALUACION' });
    expect(tabla.map((f) => f.id_equipo)).toEqual([4, 2, 3, 1]);
  });
});

describe('resolverCorte', () => {
  it('devuelve los clasificados cuando el corte es claro', () => {
    const tabla = ordenarTabla([fila(1, 6), fila(2, 3), fila(3, 0)]);
    const corte = resolverCorte(tabla, 1);
    expect(corte.empateEnCorte).toBe(false);
    expect(corte.clasificados.map((f) => f.id_equipo)).toEqual([1]);
  });

  it('no elige a nadie si el empate cae justo en el corte', () => {
    const tabla = ordenarTabla([fila(1, 3, 1, 1), fila(2, 3, 1, 1), fila(3, 0)]);
    const corte = resolverCorte(tabla, 1);
    expect(corte.empateEnCorte).toBe(true);
    expect(corte.clasificados).toEqual([]);
    expect(corte.empatados.map((f) => f.id_equipo)).toEqual([1, 2]);
  });

  it('ignora un empate que queda por debajo del corte', () => {
    const tabla = ordenarTabla([fila(1, 6), fila(2, 0, 1, 1), fila(3, 0, 1, 1)]);
    expect(resolverCorte(tabla, 1).empateEnCorte).toBe(false);
  });

  it('acepta pedir más clasificados que equipos', () => {
    const tabla = ordenarTabla([fila(1, 6), fila(2, 0)]);
    expect(resolverCorte(tabla, 5).clasificados).toHaveLength(2);
  });
});

describe('resolverConDesempate', () => {
  const empatada = () => ordenarTabla([fila(1, 6), fila(2, 3, 1, 1), fila(3, 3, 1, 1), fila(4, 0)]);

  it('sin empate no necesita elección', () => {
    const corte = resolverConDesempate(empatada(), 1);
    expect(corte.valido).toBe(true);
    expect(corte.clasificados.map((f) => f.id_equipo)).toEqual([1]);
  });

  it('rechaza finalizar un empate sin elegir', () => {
    const corte = resolverConDesempate(empatada(), 2);
    expect(corte.valido).toBe(false);
    expect(corte.cupos).toBe(1);
  });

  it('suma al elegido a los que ya clasificaban', () => {
    const corte = resolverConDesempate(empatada(), 2, [3]);
    expect(corte.valido).toBe(true);
    expect(corte.clasificados.map((f) => f.id_equipo)).toEqual([1, 3]);
  });

  it('rechaza a un equipo que no está empatado', () => {
    expect(resolverConDesempate(empatada(), 2, [4]).valido).toBe(false);
  });

  it('rechaza elegir más equipos que cupos o repetir', () => {
    expect(resolverConDesempate(empatada(), 2, [2, 3]).valido).toBe(false);
    const dobles = ordenarTabla([fila(1, 3, 1, 1), fila(2, 3, 1, 1), fila(3, 3, 1, 1)]);
    expect(resolverConDesempate(dobles, 2, [1, 1]).valido).toBe(false);
  });
});

describe('repartirEnZonas', () => {
  it('agrupa de a N y deja el resto en la última zona', () => {
    expect(repartirEnZonas([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('sin tamaño deja una sola zona', () => {
    expect(repartirEnZonas([1, 2, 3], null)).toEqual([[1, 2, 3]]);
  });
});

describe('criteriosValidos', () => {
  it('descarta lo desconocido y cae en el orden por defecto', () => {
    expect(criteriosValidos(['DIFERENCIA', 'OTRO'])).toEqual(['DIFERENCIA']);
    expect(criteriosValidos(null)).toEqual(['PUNTOS', 'DIFERENCIA', 'A_FAVOR']);
  });
});
