import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { MatchLivePage } from '../../../src/pages/matches/MatchLivePage.js';
import matchService from '../../../src/services/matchService.js';
import { ROLE_IDS } from '../../../src/config/constants.js';

vi.mock('../../../src/services/matchService.js', () => ({
  default: {
    getLive: vi.fn(),
    getEvents: vi.fn(),
    createEvent: vi.fn(),
    annulEvent: vi.fn(),
    clockAction: vi.fn(),
    updateResult: vi.fn()
  }
}));

/**
 * Respuesta de `GET /matches/:id/live`. El reloj viene con la forma unica que
 * comparten `findLive` y el endpoint del reloj: `{estado, iniciado_en,
 * acumulado_seg, segundos}`. `server_time` es lo que permite corregir la
 * desviacion del reloj del navegador.
 */
const LIVE = (over = {}) => ({
  data: {
    partido: {
      id_partido: 7,
      estado: 'En Juego',
      torneo: 'Torneo Otoño',
      disciplina_nombre: 'Fútbol 5',
      fecha: '2026-10-05',
      hora: '18:00',
      cancha_nombre: 'Cancha 1',
      ...(over.partido || {})
    },
    equipos: {
      local: { id: 10, nombre: 'Local FC' },
      visitante: { id: 20, nombre: 'Visitante FC' },
      ...(over.equipos || {})
    },
    arbitros: over.arbitros || [{ id: 3, nombre: 'Ruiz', rol: 'PRINCIPAL' }],
    marcador: { local: 1, visitante: 0, ...(over.marcador || {}) },
    reloj: {
      estado: 'EN_CURSO',
      iniciado_en: '2026-10-05T18:00:00.000Z',
      acumulado_seg: 300,
      segundos: 421,
      ...(over.reloj || {})
    },
    server_time: '2026-10-05T18:07:01.000Z'
  }
});

const EVENTOS = (data = []) => ({ data });

const EVENTO = (over = {}) => ({
  id_evento: 1,
  numero_evento: 1,
  equipo_nombre: 'Local FC',
  segundos_partido: 421,
  arbitro_nombre: 'Ruiz',
  hora_real: '2026-10-05T18:07:01.000Z',
  estado: 'CONFIRMADO',
  ...over
});

describe('MatchLivePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    matchService.getLive.mockResolvedValue(LIVE());
    matchService.getEvents.mockResolvedValue(EVENTOS([EVENTO()]));
    matchService.createEvent.mockResolvedValue({ data: EVENTO() });
    matchService.annulEvent.mockResolvedValue({ data: EVENTO({ estado: 'ANULADO' }) });
    matchService.clockAction.mockResolvedValue({ data: {} });
    matchService.updateResult.mockResolvedValue({ data: {} });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  const onNavigate = vi.fn();
  const ARBITRO = { id_usuario: 3, rol: 'Arbitro' };
  const ADMIN = { id_usuario: 12, rol: 'Administrador' };
  const renderPage = (matchId = 7, user = ARBITRO) =>
    render(<MatchLivePage matchId={matchId} onNavigate={onNavigate} user={user} />);

  // El rotulo del marcador y el del reloj son los puntos de anclaje. Los
  // nombres de equipo aparecen tambien en la tabla de eventos, asi que un
  // `getByText('Local FC')` sin acotar matchearia dos elementos.
  const esperarCarga = () =>
    waitFor(() => expect(screen.getByRole('status', { name: /Marcador:/ })).toBeInTheDocument());

  const marcador = () => screen.getByRole('status', { name: /Marcador:/ });
  const reloj = () => screen.getByRole('timer');

  it('muestra el marcador derivado y el reloj', async () => {
    renderPage();
    await esperarCarga();

    // El rotulo lleva los dos numeros y a que equipo corresponde cada uno.
    expect(marcador()).toHaveAttribute('aria-label', 'Marcador: Local FC 1, Visitante FC 0');
    // 421 segundos de reloj = 07:01.
    expect(reloj()).toHaveAttribute('aria-label', 'Tiempo de partido: 07:01, corriendo');
    expect(reloj()).toHaveTextContent('07:01');
  });

  it('no ofrece ningun campo para escribir el resultado', async () => {
    renderPage();
    await esperarCarga();

    // La garantia central del modulo: si aparezca un input numerico, el
    // marcador tendria dos fuentes de verdad.
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.getByText(/El marcador se cuenta solo/i)).toBeInTheDocument();
  });

  it('registra el evento del equipo que se aprieta', async () => {
    const user = userEvent.setup();
    renderPage();
    await esperarCarga();

    await user.click(screen.getByRole('button', { name: /Gol Local FC/i }));

    await waitFor(() => expect(matchService.createEvent).toHaveBeenCalledTimes(1));
    const [id, cuerpo] = matchService.createEvent.mock.calls[0];
    expect(id).toBe(7);
    expect(cuerpo.id_equipo).toBe(10);
    // La clave de idempotencia la genera el cliente por click. Sin ella, un
    // doble toque registraria dos goles.
    expect(typeof cuerpo.idempotency_key).toBe('string');
    expect(cuerpo.idempotency_key.length).toBeGreaterThan(0);
  });

  it('manda una clave distinta en cada click', async () => {
    const user = userEvent.setup();
    renderPage();
    await esperarCarga();

    const boton = screen.getByRole('button', { name: /Gol Visitante FC/i });
    await user.click(boton);
    await waitFor(() => expect(matchService.createEvent).toHaveBeenCalledTimes(1));
    await user.click(boton);
    await waitFor(() => expect(matchService.createEvent).toHaveBeenCalledTimes(2));

    const [a, b] = matchService.createEvent.mock.calls.map(([, c]) => c.idempotency_key);
    expect(a).not.toBe(b);
  });

  it('no manda el numero de evento ni los segundos: los pone la base', async () => {
    const user = userEvent.setup();
    renderPage();
    await esperarCarga();

    await user.click(screen.getByRole('button', { name: /Gol Local FC/i }));
    await waitFor(() => expect(matchService.createEvent).toHaveBeenCalled());

    const cuerpo = matchService.createEvent.mock.calls[0][1];
    // Si el cliente pudiera mandarlos, un arbitro podria retroadatar un gol.
    expect(cuerpo.numero_evento).toBeUndefined();
    expect(cuerpo.segundos_partido).toBeUndefined();
    expect(cuerpo.hora_real).toBeUndefined();
  });

  it('avisa si el evento no se pudo registrar', async () => {
    const user = userEvent.setup();
    matchService.createEvent.mockRejectedValue(new Error('El reloj no esta en curso'));
    renderPage();
    await esperarCarga();

    await user.click(screen.getByRole('button', { name: /Gol Local FC/i }));

    expect(await screen.findByText('El reloj no esta en curso')).toBeInTheDocument();
  });

  it('muestra el reloj como pausado y ofrece reanudarlo', async () => {
    matchService.getLive.mockResolvedValue(LIVE({ reloj: { estado: 'PAUSADO', segundos: 300 } }));
    renderPage();
    await esperarCarga();

    expect(reloj()).toHaveTextContent('05:00');
    expect(screen.getByRole('button', { name: /Reanudar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pausar/i })).not.toBeInTheDocument();
  });

  it('ofrece iniciar cuando el reloj esta pendiente', async () => {
    matchService.getLive.mockResolvedValue(LIVE({ reloj: { estado: 'PENDIENTE', segundos: 0 } }));
    renderPage();
    await esperarCarga();

    expect(screen.getByRole('button', { name: /Iniciar reloj/i })).toBeInTheDocument();
  });

  it('manda la accion correcta del reloj', async () => {
    const user = userEvent.setup();
    renderPage();
    await esperarCarga();

    await user.click(screen.getByRole('button', { name: /Pausar/i }));
    await waitFor(() => expect(matchService.clockAction).toHaveBeenCalledWith(7, 'PAUSAR'));
  });

  it('avisa si el reloj no se pudo mover', async () => {
    const user = userEvent.setup();
    matchService.clockAction.mockRejectedValue(new Error('El reloj no esta en curso'));
    renderPage();
    await esperarCarga();

    await user.click(screen.getByRole('button', { name: /Pausar/i }));

    expect(await screen.findByText('El reloj no esta en curso')).toBeInTheDocument();
  });

  it('lista el historial de eventos con numero, equipo y arbitro', async () => {
    matchService.getEvents.mockResolvedValue(EVENTOS([
      EVENTO(),
      EVENTO({ id_evento: 2, numero_evento: 2, equipo_nombre: 'Visitante FC', segundos_partido: 500 })
    ]));
    renderPage();
    await esperarCarga();

    const tabla = within(screen.getByRole('table'));
    expect(tabla.getByText('#1')).toBeInTheDocument();
    expect(tabla.getByText('#2')).toBeInTheDocument();
    expect(tabla.getAllByText('Ruiz').length).toBeGreaterThan(0);
    // 500 segundos = 08:20.
    expect(tabla.getByText('08:20')).toBeInTheDocument();
  });

  it('distingue quien arbitro de quien escribio el evento', async () => {
    matchService.getEvents.mockResolvedValue(EVENTOS([
      EVENTO(),                                                   // arbitro normal
      EVENTO({ id_evento: 2, numero_evento: 2, arbitro_nombre: null,
               registrado_por_nombre: 'Liparelli' })              // cargado por admin
    ]));
    renderPage();
    await esperarCarga();

    const tabla = within(screen.getByRole('table'));
    expect(tabla.getByText('Ruiz')).toBeInTheDocument();
    // El admin no arbitra ese partido, asi que su evento no tiene arbitro. Pero
    // si se sabe quien lo escribio, y eso es lo que sirve para auditarlo.
    expect(tabla.getByText('Liparelli')).toBeInTheDocument();
    expect(tabla.getByText('(admin)')).toBeInTheDocument();
    // Y no se lo muestra como si fuera el arbitro del partido.
    expect(tabla.queryByText(/sin arbitro/)).not.toBeInTheDocument();
  });

  it('dice desconocido cuando no se sabe quien cargo el evento', async () => {
    // Backfill de los partidos que ya tenian resultado sin arbitro asignado:
    // ahi el dato no existe y hay que decirlo, no inventar un nombre.
    matchService.getEvents.mockResolvedValue(EVENTOS([
      EVENTO({ arbitro_nombre: null, registrado_por_nombre: null })
    ]));
    renderPage();
    await esperarCarga();

    expect(within(screen.getByRole('table')).getByText('desconocido')).toBeInTheDocument();
  });

  it('avisa cuando el partido todavia no tiene eventos', async () => {
    matchService.getEvents.mockResolvedValue(EVENTOS([]));
    renderPage();
    await esperarCarga();

    expect(screen.getByText(/Todav[ií]a no hay eventos/i)).toBeInTheDocument();
  });

  it('exige motivo para anular y no manda nada sin el', async () => {
    const user = userEvent.setup();
    renderPage();
    await esperarCarga();

    await user.click(screen.getByRole('button', { name: 'Anular' }));
    expect(await screen.findByRole('heading', { name: /Anular evento #1/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Anular evento' }));

    expect(await screen.findByText(/El motivo es obligatorio/i)).toBeInTheDocument();
    expect(matchService.annulEvent).not.toHaveBeenCalled();
  });

  it('anula el evento con el motivo escrito', async () => {
    const user = userEvent.setup();
    renderPage();
    await esperarCarga();

    await user.click(screen.getByRole('button', { name: 'Anular' }));
    const input = await screen.findByPlaceholderText(/gol en propia/i);
    await user.type(input, 'Gol en propia');
    await user.click(screen.getByRole('button', { name: 'Anular evento' }));

    await waitFor(() => expect(matchService.annulEvent).toHaveBeenCalledWith(
      7, 1, { motivo_anulacion: 'Gol en propia' }
    ));
  });

  it('no ofrece anular en un evento ya anulado', async () => {
    matchService.getEvents.mockResolvedValue(EVENTOS([
      EVENTO({ estado: 'ANULADO', motivo_anulacion: 'Mal anotado' })
    ]));
    renderPage();
    await esperarCarga();

    const tabla = within(screen.getByRole('table'));
    expect(tabla.getByText('Anulado')).toBeInTheDocument();
    // Y el motivo queda a la vista: un evento anulado sin explicacion es
    // indistinguible de un error de sistema.
    expect(tabla.getByText('Mal anotado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Anular' })).not.toBeInTheDocument();
  });

  it('no deja registrar en un partido que todavia no esta en juego', async () => {
    matchService.getLive.mockResolvedValue(LIVE({ partido: { estado: 'Pendiente' } }));
    renderPage();
    await esperarCarga();

    expect(screen.queryByRole('button', { name: /Gol Local/i })).not.toBeInTheDocument();
    expect(screen.getByText(/tiene que estar "En Juego"/i)).toBeInTheDocument();
  });

  it('no deja registrar en un partido finalizado', async () => {
    matchService.getLive.mockResolvedValue(LIVE({ partido: { estado: 'Finalizado' } }));
    renderPage();
    await esperarCarga();

    expect(screen.queryByRole('button', { name: /Gol Local/i })).not.toBeInTheDocument();
    expect(screen.getByText(/El partido esta cerrado/i)).toBeInTheDocument();
  });

  it('avisa al arbitro que sin asignacion no puede registrar', async () => {
    matchService.getLive.mockResolvedValue(LIVE({ arbitros: [] }));
    renderPage();
    await esperarCarga();

    expect(screen.getByText(/no tiene arbitros asignados/i)).toBeInTheDocument();
  });

  it('el admin registra igual en un partido sin arbitros y no ve el aviso', async () => {
    const user = userEvent.setup();
    // Partido sin staff: es exactamente el caso en el que el backend rechazar
    // al admin con un 500 por violar la FK de `staff_partido`.
    matchService.getLive.mockResolvedValue(LIVE({ arbitros: [] }));
    renderPage(7, ADMIN);
    await esperarCarga();

    // El aviso dice "registrar requiere estar en el staff". Para el admin es
    // falso, y mostrarlo le aparenta un bloqueo que no tiene.
    expect(screen.queryByText(/no tiene arbitros asignados/i)).not.toBeInTheDocument();
    // Y sobre todo: tiene los botones para hacerlo.
    expect(screen.getByRole('button', { name: /Gol Local FC/i })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: /Gol Local FC/i }));
    await waitFor(() => expect(matchService.createEvent).toHaveBeenCalledTimes(1));
  });

  it('tambien acepta el rol numerico del admin', async () => {
    // `id_rol` de Administrador es 3 (el 1 es Profesor, no admin). Si la
    // pantalla solo mirara `rol`, un perfil con el rol como numero veria el
    // aviso.
    matchService.getLive.mockResolvedValue(LIVE({ arbitros: [] }));
    renderPage(7, { id_usuario: 12, id_rol: ROLE_IDS.ADMINISTRADOR });
    await esperarCarga();

    expect(screen.queryByText(/no tiene arbitros asignados/i)).not.toBeInTheDocument();
  });

  it('el SuperAdmin tambien registra en un partido sin arbitros', async () => {
    matchService.getLive.mockResolvedValue(LIVE({ arbitros: [] }));
    renderPage(7, { id_usuario: 12, rol: 'SuperAdmin' });
    await esperarCarga();

    expect(screen.queryByText(/no tiene arbitros asignados/i)).not.toBeInTheDocument();
  });

  it('cierra el resultado sin mandar los goles', async () => {
    const user = userEvent.setup();
    renderPage();
    await esperarCarga();

    await user.click(screen.getByRole('button', { name: /Cerrar resultado 1 - 0/ }));

    await waitFor(() => expect(matchService.updateResult).toHaveBeenCalledWith(7, {}));
    // Un body con los numeros seria la puerta de atras que este modulo cierra.
    const [, cuerpo] = matchService.updateResult.mock.calls[0];
    expect(cuerpo.goles_local).toBeUndefined();
    expect(cuerpo.goles_visitante).toBeUndefined();
  });

  it('no deja cerrar el resultado antes de que arranque el reloj', async () => {
    matchService.getLive.mockResolvedValue(LIVE({ reloj: { estado: 'PENDIENTE', segundos: 0 } }));
    renderPage();
    await esperarCarga();

    expect(screen.getByRole('button', { name: /Cerrar resultado/ })).toBeDisabled();
    expect(screen.getByText(/antes de que el reloj haya arrancado/i)).toBeInTheDocument();
  });

  it('llama a las dos consultas juntas para que el marcador y el reloj coincidan', async () => {
    renderPage();
    await esperarCarga();

    // Encadenadas se veria "1-0" con el reloj de antes del gol.
    expect(matchService.getLive).toHaveBeenCalledWith(7);
    expect(matchService.getEvents).toHaveBeenCalledWith(7, { limit: 100 });
  });

  it('vuelve a la lista de partidos', async () => {
    const user = userEvent.setup();
    renderPage();
    await esperarCarga();

    await user.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onNavigate).toHaveBeenCalledWith('mis-partidos');
  });

  it('muestra el error si no se pudo cargar el partido', async () => {
    matchService.getLive.mockRejectedValue(new Error('Partido no encontrado'));
    renderPage();

    expect(await screen.findByText('Partido no encontrado')).toBeInTheDocument();
  });

  it.each([
    ['Fútbol', 'Gol'],
    ['Futsal', 'Gol'],
    ['Voleibol', 'Punto'],
    ['Baloncesto', 'Punto'],
    // El nombre de la disciplina es texto libre del administrador, asi que la
    // palabra tiene que salir bien con o sin tilde.
    ['Vóley', 'Punto'],
    ['Voley', 'Punto'],
    ['BALONCESTO', 'Punto'],
    // Y una disciplina desconocida cae en la palabra neutra.
    ['Disciplina Valida 1', 'Gol']
  ])('llama "%s" a la anotacion "%s"', async (disciplina, palabra) => {
    matchService.getLive.mockResolvedValue(LIVE({ partido: { disciplina_nombre: disciplina } }));
    renderPage();
    await esperarCarga();

    // En la base el tipo es ANOTACION, que es el termino comun a los deportes.
    // "Gol" y "Punto" son palabras de la disciplina, no del dato.
    expect(screen.getByRole('button', { name: new RegExp(`${palabra} Local FC`, 'i') })).toBeInTheDocument();
  });
});
