const { validationResult } = require('express-validator');
const router = require('../../src/routes/partido.routes');

const { VALIDACION_UPDATE } = router;

async function errores(body) {
  const req = { body };
  for (const chain of VALIDACION_UPDATE) {
    await chain.run(req);
  }
  return validationResult(req).array().map((e) => e.msg);
}

describe('PUT /matches/:id — validacion del body', () => {
  describe('el vacio de un formulario', () => {
    it('acepta id_cancha vacio', async () => {
      expect(await errores({ id_cancha: '' })).toEqual([]);
    });

    it('acepta null, que es como lo manda un cliente que no lo tiene', async () => {
      expect(await errores({ id_cancha: null })).toEqual([]);
    });

    it('acepta los demas ids vacios, que el formulario tambien manda como texto', async () => {
      expect(await errores({
        id_torneo: '',
        id_equipo_local: '',
        id_equipo_visitante: '',
        id_cancha: ''
      })).toEqual([]);
    });

    it('acepta estado vacio en vez de pedir un estado que el formulario no manda', async () => {
      expect(await errores({ estado: '' })).toEqual([]);
    });
  });

  describe('lo que si tiene que rechazar', () => {
    it('rechaza un id_cancha que no es un numero', async () => {
      expect(await errores({ id_cancha: 'no-es-un-id' })).not.toEqual([]);
    });

    it('rechaza un id_torneo que no es un numero', async () => {
      expect(await errores({ id_torneo: 'abc' })).not.toEqual([]);
    });

    it('rechaza un estado fuera de la lista', async () => {
      expect(await errores({ estado: 'Inventado' })).not.toEqual([]);
    });

    it('rechaza arbitros que no es un arreglo', async () => {
      expect(await errores({ arbitros: '22' })).not.toEqual([]);
    });
  });

  describe('los valores que si deben pasar', () => {
    it('acepta los ids como texto numerico, que es como los manda el formulario', async () => {
      expect(await errores({
        id_torneo: '29',
        id_equipo_local: '28',
        id_equipo_visitante: '30',
        id_cancha: '19'
      })).toEqual([]);
    });

    it('acepta un estado de la lista', async () => {
      expect(await errores({ estado: 'Pendiente' })).toEqual([]);
    });

    it('acepta arbitros como arreglo, includedo el vacio', async () => {
      expect(await errores({ arbitros: [] })).toEqual([]);
      expect(await errores({ arbitros: [22] })).toEqual([]);
    });

    it('acepta un body vacio: no mandas nada y no se toca nada', async () => {
      expect(await errores({})).toEqual([]);
    });
  });
});
