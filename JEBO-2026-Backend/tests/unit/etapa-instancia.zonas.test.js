jest.mock('../../src/config/knex', () => jest.fn());

const etapaInstanciaService = require('../../src/services/etapa-instancia.service');
const { BusinessError } = require('../../src/utils/errors');

const candidatos = [
  { id_equipo: 1, equipo_nombre: 'Uno', id_region: 10 },
  { id_equipo: 2, equipo_nombre: 'Dos', id_region: 20 },
  { id_equipo: 3, equipo_nombre: 'Tres', id_region: 20 }
];

describe('EtapaInstanciaService._zonasManuales', () => {
  it('arma las zonas con sus equipos y las regiones distintas', () => {
    const grupos = etapaInstanciaService._zonasManuales(
      [{ nombre: 'Zona A', equipos: [1, 2] }, { nombre: 'Zona B', equipos: ['3'] }],
      candidatos
    );
    expect(grupos).toEqual([
      { nombre: 'Zona A', territorios: [{ id_region: 10 }, { id_region: 20 }], equipos: [candidatos[0], candidatos[1]] },
      { nombre: 'Zona B', territorios: [{ id_region: 20 }], equipos: [candidatos[2]] }
    ]);
  });

  it.each([
    ['nombre vacío', [{ nombre: ' ', equipos: [1, 2, 3] }], /nombre/],
    ['nombre repetido', [{ nombre: 'A', equipos: [1] }, { nombre: 'A', equipos: [2, 3] }], /más de una vez/],
    ['equipo no habilitado', [{ nombre: 'A', equipos: [1, 2, 3, 9] }], /no está habilitado/],
    ['equipo en dos zonas', [{ nombre: 'A', equipos: [1, 2] }, { nombre: 'B', equipos: [2, 3] }], /más de una zona/],
    ['zona vacía', [{ nombre: 'A', equipos: [1, 2, 3] }, { nombre: 'B', equipos: [] }], /no tiene equipos/],
    ['equipo sin zona', [{ nombre: 'A', equipos: [1, 2] }], /Equipos sin zona: Tres/]
  ])('rechaza %s', (_caso, zonas, mensaje) => {
    expect(() => etapaInstanciaService._zonasManuales(zonas, candidatos)).toThrow(BusinessError);
    expect(() => etapaInstanciaService._zonasManuales(zonas, candidatos)).toThrow(mensaje);
  });
});
