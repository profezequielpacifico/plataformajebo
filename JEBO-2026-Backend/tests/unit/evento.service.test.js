const { eventoService, relojService } = require('../../src/services/evento.service');
const { NotFoundError, BusinessError, ForbiddenError, ValidationError } = require('../../src/utils/errors');
const { ESTADOS_PARTIDO, ESTADOS_RELOJ, ROLES } = require('../../src/constants');

// El nucleo del modulo son dos reglas que no se pueden probar end-to-end sin
// montar un partido entero: que un arbitro no pueda registrar fuera de su
// partido, y que un evento anulado no se pueda reabrir. Estas aisan los
// repositorios y dejan la logica de negocio a la vista.
jest.mock('../../src/repositories', () => ({
  PartidoRepository: { findById: jest.fn() },
  EventoRepository: {
    registrar: jest.fn(),
    findById: jest.fn(),
    findByPartido: jest.fn(),
    findByIdempotencyKey: jest.fn(),
    anular: jest.fn()
  },
  StaffPartidoRepository: { findByPartido: jest.fn() },
  RelojRepository: {
    segundosActuales: jest.fn(),
    iniciar: jest.fn(),
    pausar: jest.fn(),
    reanudar: jest.fn()
  }
}));

jest.mock('../../src/services/bitacora.service', () => ({ log: jest.fn() }));
jest.mock('../../src/config/knex', () => {
  const trx = Object.assign(jest.fn(), {
    raw: jest.fn().mockResolvedValue(undefined)
  });
  const knexMock = jest.fn();
  knexMock.transaction = jest.fn((cb) => cb(trx));
  knexMock.raw = jest.fn().mockResolvedValue({ rows: [{ server_time: '2026-10-01T00:00:00Z' }] });
  knexMock.fn = { now: jest.fn() };
  knexMock.__trx = trx;
  return knexMock;
});

const { PartidoRepository: PR, EventoRepository: ER, StaffPartidoRepository: SR, RelojRepository: RR } =
  require('../../src/repositories');
const bitacoraService = require('../../src/services/bitacora.service');
const knexMock = require('../../src/config/knex');

const ARBITRO = { id_usuario: 7 };
const CTX_ARBITRO = { userId: 7, rol: ROLES.ARBITRO, ip: '10.0.0.1', userAgent: 'jest' };
const CTX_ADMIN = { userId: 1, rol: ROLES.ADMIN, ip: '10.0.0.1', userAgent: 'jest' };
const ALCANCE = { global: true };

const partido = (over = {}) => ({
  id_partido: 1,
  id_torneo: 10,
  id_equipo_local: 100,
  id_equipo_visitante: 101,
  estado: ESTADOS_PARTIDO.EN_JUEGO,
  reloj_estado: ESTADOS_RELOJ.EN_CURSO,
  ...over
});

const EVENTO = {
  id_evento: 500,
  id_partido: 1,
  numero_evento: 3,
  tipo_evento: 'ANOTACION',
  id_equipo: 100,
  segundos_partido: 421,
  estado: 'CONFIRMADO'
};

describe('evento.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PR.findById.mockResolvedValue(partido());
    SR.findByPartido.mockResolvedValue([ARBITRO]);
    ER.findById.mockResolvedValue(EVENTO);
  });

  describe('registrar', () => {
    it('registra contra el ledger y devuelve el evento leido', async () => {
      ER.findByIdempotencyKey.mockResolvedValue(undefined);
      ER.registrar.mockResolvedValue(EVENTO);

      const r = await eventoService.registrar(1, { id_equipo: 100 }, { ...CTX_ARBITRO, alcance: ALCANCE });

      // El numero de evento y los segundos los calcula la misma sentencia SQL
      // que escribe `hora_real`. Si el servicio los armara, cada evento
      // tendria dos relojes distintos.
      expect(ER.registrar).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id_partido: 1, id_equipo: 100, id_usuario_arbitro: 7, registrado_por: 7 })
      );
      expect(r.id_evento).toBe(500);
    });

    it('un arbitro no asignado no registra', async () => {
      SR.findByPartido.mockResolvedValue([{ id_usuario: 99 }]);

      await expect(eventoService.registrar(1, { id_equipo: 100 }, { ...CTX_ARBITRO, alcance: ALCANCE }))
        .rejects.toBeInstanceOf(ForbiddenError);
      expect(ER.registrar).not.toHaveBeenCalled();
    });

    it('un rol que no es arbitro ni admin no registra', async () => {
      // PROFESOR no esta en el staff nunca, asi que la regla de arbitro lo
      // rechazaria igual; el Rol insuficiente es lo que evita depender de eso.
      await expect(
        eventoService.registrar(1, { id_equipo: 100 }, { userId: 9, rol: ROLES.PROFESOR, alcance: ALCANCE })
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('el admin registra sin estar en el staff, y el evento queda sin arbitro atribuido', async () => {
      ER.findByIdempotencyKey.mockResolvedValue(undefined);
      ER.registrar.mockResolvedValue(EVENTO);

      await eventoService.registrar(1, { id_equipo: 100 }, { ...CTX_ADMIN, alcance: ALCANCE });

      // `id_usuario_arbitro` va en NULL, NO con el id del admin. En la base hay
      // una FK compuesta `(id_partido, id_usuario_arbitro) -> staff_partido`, y
      // el admin no esta en el staff de ese partido: mandarlo ahi hace fallar el
      // INSERT con una violaciones de FK, que el usuario recibia como 500.
      //
      // Ojo con este test: con `ER.registrar` mockeado la FK no se ejecuta, asi
      // que un `id_usuario_arbitro` equivocado aqui PASA. El bug solo aparece
      // contra la base real, y por eso hay `scripts/verificar-carga-partido.js`.
      // Lo que este test si protege es que no volvamos a mandar al admin como
      // arbitro de un partido que no arbitra.
      expect(ER.registrar).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id_usuario_arbitro: null, registrado_por: 1 })
      );
    });

    it('el arbitro asignado si queda como id_usuario_arbitro', async () => {
      ER.findByIdempotencyKey.mockResolvedValue(undefined);
      ER.registrar.mockResolvedValue(EVENTO);

      await eventoService.registrar(1, { id_equipo: 100 }, { ...CTX_ARBITRO, alcance: ALCANCE });

      // El caso normal: arbitra y aprieta el boton, asi que ambas columnas
      // coinciden. Si esto se rompe, se pierde la atribucion real del gol.
      expect(ER.registrar).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id_usuario_arbitro: 7, registrado_por: 7 })
      );
    });

    it('rechaza un equipo que no juega ese partido', async () => {
      // La FK solo puede decir que el equipo existe. Que PARTICIPE lo tiene que
      // verificar el servicio: si no, un arbitro podria cargar un gol al
      // equipo del otro torneo.
      await expect(eventoService.registrar(1, { id_equipo: 999 }, { ...CTX_ARBITRO, alcance: ALCANCE }))
        .rejects.toBeInstanceOf(BusinessError);
      expect(ER.registrar).not.toHaveBeenCalled();
    });

    it('no registra fuera de "En Juego"', async () => {
      PR.findById.mockResolvedValue(partido({ estado: ESTADOS_PARTIDO.FINALIZADO }));

      await expect(eventoService.registrar(1, { id_equipo: 100 }, { ...CTX_ARBITRO, alcance: ALCANCE }))
        .rejects.toBeInstanceOf(BusinessError);
      expect(ER.registrar).not.toHaveBeenCalled();
    });

    it('rechaza un id de equipo no numerico', async () => {
      await expect(eventoService.registrar(1, { id_equipo: 'abc' }, { ...CTX_ARBITRO, alcance: ALCANCE }))
        .rejects.toBeInstanceOf(ValidationError);
    });

    it('con idempotency_key repetida devuelve el evento previo y no inserta', async () => {
      // El doble tap y el retry de red se resuelven con la clave unica de la
      // base, no con un debounce de cliente: un debounce no protege de un
      // reintento, y el arbitro que toca dos veces rapido ya habria duplicado.
      ER.findByIdempotencyKey.mockResolvedValue(EVENTO);

      const r = await eventoService.registrar(
        1,
        { id_equipo: 100, idempotency_key: 'abc' },
        { ...CTX_ARBITRO, alcance: ALCANCE }
      );

      expect(ER.registrar).not.toHaveBeenCalled();
      expect(r.id_evento).toBe(500);
    });

    it('sin idempotency_key no busca un previo', async () => {
      ER.findByIdempotencyKey.mockResolvedValue(undefined);
      ER.registrar.mockResolvedValue(EVENTO);

      await eventoService.registrar(1, { id_equipo: 100 }, { ...CTX_ARBITRO, alcance: ALCANCE });

      expect(ER.findByIdempotencyKey).not.toHaveBeenCalled();
    });

    it('toma el advisory lock del partido antes de insertar', async () => {
      ER.findByIdempotencyKey.mockResolvedValue(undefined);
      ER.registrar.mockResolvedValue(EVENTO);

      await eventoService.registrar(1, { id_equipo: 100 }, { ...CTX_ARBITRO, alcance: ALCANCE });

      // Serializa los registros del mismo partido sin bloquear los de otros.
      expect(knexMock.__trx.raw).toHaveBeenCalledWith(
        expect.stringContaining('pg_advisory_xact_lock'),
        [1]
      );
    });

    it('registra el evento en la bitacora', async () => {
      ER.findByIdempotencyKey.mockResolvedValue(undefined);
      ER.registrar.mockResolvedValue(EVENTO);

      await eventoService.registrar(1, { id_equipo: 100 }, { ...CTX_ARBITRO, alcance: ALCANCE });

      expect(bitacoraService.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'REGISTRAR_EVENTO_PARTIDO',
        entityId: 500,
        detail: expect.objectContaining({ id_partido: 1, numero_evento: 3, segundos_partido: 421 })
      }));
    });
  });

  describe('anular', () => {
    it('anula con motivo y deja rastro de quien y cuando', async () => {
      // El servicio lee el evento DOS veces: la primera para decidir si ya
      // estaba anulado, la segunda despues de anular. Por eso el mock en
      // secuencia y no uno fijo.
      ER.findById
        .mockResolvedValueOnce(EVENTO)
        .mockResolvedValueOnce({ ...EVENTO, estado: 'ANULADO' });
      ER.anular.mockResolvedValue({ ...EVENTO, estado: 'ANULADO' });

      const r = await eventoService.anular(
        1, 500, { motivo_anulacion: 'Gol en propia' }, { ...CTX_ARBITRO, alcance: ALCANCE }
      );

      // Nunca se borra: el marcador se recalcula solo porque es un COUNT sobre
      // los CONFIRMADOS, y el evento anulado queda disponible para la auditoria.
      expect(ER.anular).toHaveBeenCalledWith(500, { anulado_por: 7, motivo_anulacion: 'Gol en propia' });
      expect(r.estado).toBe('ANULADO');
    });

    it('exige motivo: una anulacion sin explicacion es indistinguible de un bug', async () => {
      await expect(eventoService.anular(1, 500, {}, { ...CTX_ARBITRO, alcance: ALCANCE }))
        .rejects.toBeInstanceOf(ValidationError);
      expect(ER.anular).not.toHaveBeenCalled();
    });

    it('no acepta un motivo de solo espacios', async () => {
      await expect(eventoService.anular(1, 500, { motivo_anulacion: '   ' }, { ...CTX_ARBITRO, alcance: ALCANCE }))
        .rejects.toBeInstanceOf(ValidationError);
    });

    it('no se puede anular dos veces', async () => {
      // El estado es terminal: reabrir un evento dejaria el ledger con dos
      // verdades sobre el mismo gol. La correccion es anular el viejo y
      // registrar el nuevo.
      ER.findById.mockResolvedValue({ ...EVENTO, estado: 'ANULADO' });

      await expect(eventoService.anular(1, 500, { motivo_anulacion: 'x' }, { ...CTX_ARBITRO, alcance: ALCANCE }))
        .rejects.toBeInstanceOf(BusinessError);
      expect(ER.anular).not.toHaveBeenCalled();
    });

    it('un evento de otro partido responde 404, no 403', async () => {
      // 403 confirmaria que ese evento existe. Con un id inventado de otro
      // partido tiene que ser indistinguible de uno inexistente.
      ER.findById.mockResolvedValue({ ...EVENTO, id_partido: 999 });

      await expect(eventoService.anular(1, 500, { motivo_anulacion: 'x' }, { ...CTX_ARBITRO, alcance: ALCANCE }))
        .rejects.toBeInstanceOf(NotFoundError);
    });

    it('un arbitro no asignado no anula', async () => {
      SR.findByPartido.mockResolvedValue([{ id_usuario: 99 }]);

      await expect(eventoService.anular(1, 500, { motivo_anulacion: 'x' }, { ...CTX_ARBITRO, alcance: ALCANCE }))
        .rejects.toBeInstanceOf(ForbiddenError);
      expect(ER.anular).not.toHaveBeenCalled();
    });

    it('no recalcula el marcador: anular lo hace solo el COUNT', async () => {
      ER.findById
        .mockResolvedValueOnce(EVENTO)
        .mockResolvedValueOnce({ ...EVENTO, estado: 'ANULADO' });
      ER.anular.mockResolvedValue({ ...EVENTO, estado: 'ANULADO' });

      await eventoService.anular(1, 500, { motivo_anulacion: 'x' }, { ...CTX_ARBITRO, alcance: ALCANCE });

      // Una sola lectura del partido: la de existencia y alcance. Si anular
      // recalculara posiciones, haria falta una segunda, y ademas el recalculo
      // manual es justamente lo que el marcador derivado evita.
      expect(PR.findById).toHaveBeenCalledTimes(1);
      expect(bitacoraService.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'ANULAR_EVENTO_PARTIDO', entityId: 500
      }));
    });
  });

  describe('findByPartido', () => {
    it('devuelve la pagina de eventos', async () => {
      ER.findByPartido.mockResolvedValue({ data: [EVENTO], total: 1, page: 1, limit: 50 });

      const r = await eventoService.findByPartido(1, { page: 1, limit: 50 }, { ...CTX_ARBITRO, alcance: ALCANCE });

      expect(ER.findByPartido).toHaveBeenCalledWith({ id_partido: 1, page: 1, limit: 50 });
      expect(r.total).toBe(1);
    });

    it('un partido inexistente es 404 y no una lista vacia', async () => {
      PR.findById.mockResolvedValue(null);

      await expect(eventoService.findByPartido(1, {}, { ...CTX_ARBITRO, alcance: ALCANCE }))
        .rejects.toBeInstanceOf(NotFoundError);
    });
  });
});

describe('relojService', () => {
  beforeEach(() => {
    // `resetAllMocks` y no `clearAllMocks`: el segundo borra las llamadas pero
    // conserva las implementaciones, asi que un `mockResolvedValue` de un test
    // anterior seguiria contaminando el siguiente y los guards de estado, que
    // dependen de que el repositorio NO encuentre la fila, no se ejercitarian.
    jest.resetAllMocks();
    PR.findById.mockResolvedValue(partido());
    SR.findByPartido.mockResolvedValue([ARBITRO]);
    RR.segundosActuales.mockResolvedValue({
      reloj_estado: ESTADOS_RELOJ.EN_CURSO,
      reloj_iniciado_en: '2026-10-01T00:00:00Z',
      reloj_acumulado_seg: 300,
      segundos_actuales: 421
    });
    RR.iniciar.mockResolvedValue({ reloj_estado: ESTADOS_RELOJ.EN_CURSO });
    RR.pausar.mockResolvedValue({ reloj_estado: ESTADOS_RELOJ.PAUSADO });
    RR.reanudar.mockResolvedValue({ reloj_estado: ESTADOS_RELOJ.EN_CURSO });
  });

  describe('accion', () => {
    it('inicia el reloj desde PENDIENTE', async () => {
      PR.findById.mockResolvedValue(partido({ reloj_estado: ESTADOS_RELOJ.PENDIENTE }));

      await relojService.accion(1, 'INICIAR', { ...CTX_ARBITRO, alcance: ALCANCE });

      expect(RR.iniciar).toHaveBeenCalledWith(1);
      expect(RR.pausar).not.toHaveBeenCalled();
    });

    it('pausa el reloj que esta en curso', async () => {
      PR.findById.mockResolvedValue(partido({ reloj_estado: ESTADOS_RELOJ.EN_CURSO }));

      await relojService.accion(1, 'PAUSAR', { ...CTX_ARBITRO, alcance: ALCANCE });

      expect(RR.pausar).toHaveBeenCalledWith(1);
      expect(RR.reanudar).not.toHaveBeenCalled();
    });

    it('reanuda el reloj pausado', async () => {
      PR.findById.mockResolvedValue(partido({ reloj_estado: ESTADOS_RELOJ.PAUSADO }));

      await relojService.accion(1, 'REANUDAR', { ...CTX_ARBITRO, alcance: ALCANCE });

      expect(RR.reanudar).toHaveBeenCalledWith(1);
      expect(RR.pausar).not.toHaveBeenCalled();
    });

    it('rechaza una accion desconocida sin tocar el reloj', async () => {
      await expect(relojService.accion(1, 'REBOBINAR', { ...CTX_ARBITRO, alcance: ALCANCE }))
        .rejects.toBeInstanceOf(ValidationError);
      expect(RR.pausar).not.toHaveBeenCalled();
    });

    it('no reinicia un reloj que ya corria', async () => {
      // El `WHERE reloj_estado = 'PENDIENTE'` del repositorio devuelve
      // `undefined` cuando no encuentra la fila, y el servicio convierte ese
      // undefined en un error legible. El test reproduce exactamente ese
      // `undefined`: un mock que devuelve la fila no ejercitaria el guard.
      PR.findById.mockResolvedValue(partido({ reloj_estado: ESTADOS_RELOJ.EN_CURSO }));
      RR.iniciar.mockResolvedValue(undefined);

      await expect(relojService.accion(1, 'INICIAR', { ...CTX_ARBITRO, alcance: ALCANCE }))
        .rejects.toBeInstanceOf(BusinessError);
    });

    it('no pausa un reloj que no esta corriendo', async () => {
      PR.findById.mockResolvedValue(partido({ reloj_estado: ESTADOS_RELOJ.PENDIENTE }));

      await expect(relojService.accion(1, 'PAUSAR', { ...CTX_ARBITRO, alcance: ALCANCE }))
        .rejects.toBeInstanceOf(BusinessError);
      expect(RR.pausar).not.toHaveBeenCalled();
    });

    it('no reanuda un reloj que no esta pausado', async () => {
      PR.findById.mockResolvedValue(partido({ reloj_estado: ESTADOS_RELOJ.EN_CURSO }));

      await expect(relojService.accion(1, 'REANUDAR', { ...CTX_ARBITRO, alcance: ALCANCE }))
        .rejects.toBeInstanceOf(BusinessError);
      expect(RR.reanudar).not.toHaveBeenCalled();
    });

    it('no opera el reloj de un partido finalizado', async () => {
      PR.findById.mockResolvedValue(partido({ estado: ESTADOS_PARTIDO.FINALIZADO }));

      await expect(relojService.accion(1, 'PAUSAR', { ...CTX_ARBITRO, alcance: ALCANCE }))
        .rejects.toBeInstanceOf(BusinessError);
    });

    it('no opera el reloj de un partido cancelado', async () => {
      PR.findById.mockResolvedValue(partido({ estado: ESTADOS_PARTIDO.CANCELADO }));

      await expect(relojService.accion(1, 'PAUSAR', { ...CTX_ARBITRO, alcance: ALCANCE }))
        .rejects.toBeInstanceOf(BusinessError);
    });

    it('exige que el partido este "En Juego" para arrancar el reloj', async () => {
      PR.findById.mockResolvedValue(partido({ estado: ESTADOS_PARTIDO.PROGRAMADO, reloj_estado: ESTADOS_RELOJ.PENDIENTE }));

      await expect(relojService.accion(1, 'INICIAR', { ...CTX_ARBITRO, alcance: ALCANCE }))
        .rejects.toBeInstanceOf(BusinessError);
    });

    it('un arbitro no asignado no opera el reloj', async () => {
      SR.findByPartido.mockResolvedValue([{ id_usuario: 99 }]);

      await expect(relojService.accion(1, 'PAUSAR', { ...CTX_ARBITRO, alcance: ALCANCE }))
        .rejects.toBeInstanceOf(ForbiddenError);
    });

    it('devuelve el estado del reloj con el alcance resuelto', async () => {
      // Sin esto, `estado` relee el partido con `filtrarPorEquipos`, que LANZA
      // si no recibe un alcance (X-05): la operacion del reloj ya habria
      // ocurrido y el error caeria igual, despues del efecto.
      RR.pausar.mockResolvedValue({ reloj_estado: ESTADOS_RELOJ.PAUSADO });

      const r = await relojService.accion(1, 'PAUSAR', { ...CTX_ARBITRO, alcance: ALCANCE });

      expect(r.estado).toBeDefined();
      expect(PR.findById).toHaveBeenCalledTimes(2);
    });

    it('registra la accion del reloj en la bitacora', async () => {
      RR.pausar.mockResolvedValue({ reloj_estado: ESTADOS_RELOJ.PAUSADO });

      await relojService.accion(1, 'PAUSAR', { ...CTX_ARBITRO, alcance: ALCANCE });

      expect(bitacoraService.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'RELOJ_PAUSAR', entityId: 1
      }));
    });
  });

  describe('estado', () => {
    it('devuelve los segundos como numero, no como string', async () => {
      // `count`/`extract` en Postgres llegan como texto al driver. Si esto
      // quedara como "421", el cliente haria aritmetica con strings y el reloj
      // mostraria NaN.
      RR.segundosActuales.mockResolvedValue({
        reloj_estado: ESTADOS_RELOJ.EN_CURSO,
        reloj_iniciado_en: null,
        reloj_acumulado_seg: '0',
        segundos_actuales: '421'
      });

      const r = await relojService.estado(1, { ...CTX_ARBITRO, alcance: ALCANCE });

      expect(r.segundos).toBe(421);
      expect(typeof r.segundos).toBe('number');
    });

    it('usa la misma forma que devuelve findLive', async () => {
      const r = await relojService.estado(1, { ...CTX_ARBITRO, alcance: ALCANCE });

      // Los dos endpoints los consume la misma pantalla: que no compartan
      // nombres obliga al cliente a elegir segun de donde salio el dato.
      expect(Object.keys(r).sort()).toEqual(
        ['acumulado_seg', 'estado', 'iniciado_en', 'segundos'].sort()
      );
    });
  });
});
