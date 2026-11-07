import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { MisPartidosPage } from '../../../src/pages/matches/MisPartidosPage.js';
import matchService from '../../../src/services/matchService.js';
import tournamentService from '../../../src/services/tournamentService.js';
import disciplineService from '../../../src/services/disciplineService.js';

vi.mock('../../../src/services/matchService.js', () => ({
  default: { getMine: vi.fn(), updateStatus: vi.fn(), updateResult: vi.fn() }
}));
vi.mock('../../../src/services/tournamentService.js', () => ({
  default: { getAll: vi.fn() }
}));
vi.mock('../../../src/services/disciplineService.js', () => ({
  default: { getAll: vi.fn() }
}));

const HOY = (() => {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
})();

const PARTIDOS = [
  {
    id_partido: 1,
    fecha: HOY + 'T00:00:00.000Z',
    hora: '18:00',
    cancha_nombre: 'Cancha 1',
    torneo: 'Torneo Otoño',
    disciplina_nombre: 'Fútbol 5',
    equipo_local_nombre: 'Local FC',
    equipo_visitante_nombre: 'Visitante FC',
    estado: 'Pendiente',
    goles_local: null,
    goles_visitante: null
  },
  {
    id_partido: 2,
    fecha: HOY + 'T00:00:00.000Z',
    estado: 'Programado',
    local: 'A',
    visitante: 'B',
    goles_local: null
  },
  {
    id_partido: 3,
    estado: 'En Juego',
    local: 'Local FC',
    visitante: 'Visitante FC',
    resultado_cargado: true,
    goles_local: 2,
    goles_visitante: 1
  },
  {
    id_partido: 4,
    estado: 'Finalizado',
    equipo_local_nombre: 'Local FC',
    equipo_visitante_nombre: 'Visitante FC',
    resultado: '4 - 2',
    goles_local: 4,
    goles_visitante: 2
  },
  {
    id_partido: 5,
    estado: 'Cancelado',
    local: 'Local FC',
    visitante: 'Visitante FC'
  },
  {
    id_partido: 6,
    status: 'En progreso',
    local: 'Local FC',
    visitante: 'Visitante FC'
  }
];

const DISCIPLINAS = { data: [{ id_disciplina: 1, nombre: 'Fútbol 5' }, { id_disciplina: 2, nombre: 'Vóley' }] };
const TORNEOS = {
  data: [
    { id_torneo: 1, nombre: 'Torneo Otoño', id_disciplina: 1, disciplina_nombre: 'Fútbol 5' },
    { id_torneo: 2, nombre: 'Copa Primavera', idDisciplina: 2, disciplina_nombre: 'Vóley' }
  ]
};

describe('MisPartidosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    matchService.getMine.mockResolvedValue({ data: PARTIDOS });
    matchService.updateStatus.mockResolvedValue({});
    matchService.updateResult.mockResolvedValue({});
    tournamentService.getAll.mockResolvedValue(TORNEOS);
    disciplineService.getAll.mockResolvedValue(DISCIPLINAS);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  const onNavigate = vi.fn();
  const renderPage = (props = {}) =>
    render(<MisPartidosPage user={{ rol: 'Profesor' }} onNavigate={onNavigate} {...props} />);

  const fila = (texto) => within(screen.getByRole('table')).getAllByText(texto)[0].closest('tr');

  const botonDelModal = (nombre) => {
    const botones = screen.getAllByRole('button', { name: nombre });
    return botones[botones.length - 1];
  };

  const esperarCarga = () =>
    waitFor(() => expect(screen.queryByText('Cargando...')).not.toBeInTheDocument());

  it('muestra el mismo dia que devuelve la API en hora de Argentina', async () => {
    vi.stubEnv('TZ', 'America/Argentina/Buenos_Aires');
    matchService.getMine.mockResolvedValue({
      data: [{ ...PARTIDOS[3], fecha: '2026-09-30' }]
    });
    renderPage();
    await esperarCarga();
    const tabla = within(screen.getByRole('table'));
    expect(tabla.getByText('30/09/2026')).toBeInTheDocument();
    expect(tabla.queryByText('29/9/2026')).not.toBeInTheDocument();
  });

  it('carga los partidos del arbitro con el paginado por defecto', async () => {
    renderPage();
    await esperarCarga();

    expect(matchService.getMine).toHaveBeenCalledWith({ limit: 100 });
    expect(tournamentService.getAll).toHaveBeenCalledWith(1, 100);
    expect(screen.getByText('Partidos donde estás asignado como árbitro')).toBeInTheDocument();
  });

  it('cambia el subtitulo para el administrador', async () => {
    renderPage({ user: { rol: 'Administrador' } });
    await esperarCarga();

    expect(screen.getByText('Todos los partidos con filtros por deporte, torneo y estado')).toBeInTheDocument();
  });

  it('muestra los datos de cada partido y deja los vacíos como guion', async () => {
    renderPage();
    await esperarCarga();

    const primera = fila('Cancha 1');
    expect(within(primera).getByText('Torneo Otoño')).toBeInTheDocument();
    expect(within(primera).getByText('Pendiente')).toBeInTheDocument();
    expect(within(primera).getByText('—')).toBeInTheDocument();

    const segunda = fila('A');
    expect(within(segunda).getAllByText('—').length).toBeGreaterThan(3);
  });

  it('muestra el resultado cargado junto al marcador', async () => {
    renderPage();
    await esperarCarga();

    const enJuego = fila('Local FC (2)');
    expect(within(enJuego).getByText('2 - 1')).toBeInTheDocument();

    const finalizado = fila('Local FC (4)');
    expect(within(finalizado).getByText('4 - 2')).toBeInTheDocument();
  });

  it('ofrece las acciones segun el estado del partido', async () => {
    renderPage();
    await esperarCarga();

    expect(screen.getAllByRole('button', { name: /comenzar/i })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /abrir en vivo/i })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /cargar resultado/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^finalizar$/i })).toHaveLength(2);
    expect(within(fila('Cancelado')).getAllByText('—').length).toBeGreaterThan(0);
    expect(within(fila('Finalizado')).queryByRole('button')).not.toBeInTheDocument();
  });

  it('avisa cuando no hay partidos para los filtros', async () => {
    matchService.getMine.mockResolvedValue({ data: [] });
    renderPage();
    expect(await screen.findByText('No hay partidos para los filtros seleccionados')).toBeInTheDocument();
  });

  it('filtra por disciplina, torneo y estado', async () => {
    const user = userEvent.setup();
    renderPage();
    await esperarCarga();
    matchService.getMine.mockClear();
    const [deportes, torneos] = screen.getAllByRole('combobox');

    await user.selectOptions(deportes, '1');
    await waitFor(() =>
      expect(matchService.getMine).toHaveBeenLastCalledWith({ limit: 100, id_disciplina: '1' })
    );

    await user.selectOptions(torneos, '1');
    await waitFor(() =>
      expect(matchService.getMine).toHaveBeenLastCalledWith({ limit: 100, id_disciplina: '1', id_torneo: '1' })
    );

    await user.selectOptions(screen.getAllByRole('combobox')[2], 'Pendiente');
    await waitFor(() =>
      expect(matchService.getMine).toHaveBeenLastCalledWith({
        limit: 100,
        id_disciplina: '1',
        id_torneo: '1',
        estado: 'Pendiente'
      })
    );
  });

  it('filtra los torneos por la disciplina elegida', async () => {
    const user = userEvent.setup();
    renderPage();
    await esperarCarga();

    const [, select] = screen.getAllByRole('combobox');
    await user.selectOptions(screen.getAllByRole('combobox')[0], '1');

    expect(within(select).getByRole('option', { name: /Torneo Otoño/ })).toBeInTheDocument();
    expect(within(select).queryByRole('option', { name: /Copa Primavera/ })).not.toBeInTheDocument();
  });

  it('limpia el torneo al cambiar de disciplina', async () => {
    const user = userEvent.setup();
    renderPage();
    await esperarCarga();
    const [deportes, torneos] = screen.getAllByRole('combobox');

    await user.selectOptions(deportes, '1');
    await user.selectOptions(torneos, '1');
    await user.selectOptions(deportes, '2');

    expect(torneos).toHaveValue('');
    await waitFor(() =>
      expect(matchService.getMine).toHaveBeenLastCalledWith({ limit: 100, id_disciplina: '2' })
    );
  });

  it('vuelve a pedir los partidos al tocar actualizar', async () => {
    const user = userEvent.setup();
    renderPage();
    await esperarCarga();
    matchService.getMine.mockClear();

    await user.click(screen.getByRole('button', { name: /actualizar/i }));

    await waitFor(() => expect(matchService.getMine).toHaveBeenCalledWith({ limit: 100 }));
  });

  it('inicia un partido y avisa que quedo en juego', async () => {
    const user = userEvent.setup();
    renderPage();
    await esperarCarga();

    await user.click(screen.getAllByRole('button', { name: /comenzar/i })[0]);
    expect(await screen.findByText(/Dar inicio al partido/)).toBeInTheDocument();

    await user.click(botonDelModal(/^comenzar$/i));

    await waitFor(() =>
      expect(matchService.updateStatus).toHaveBeenCalledWith(1, { estado: 'En Juego' })
    );
    expect(await screen.findByText('Partido iniciado')).toBeInTheDocument();
  });

  it('avisa si el partido no se pudo iniciar', async () => {
    const user = userEvent.setup();
    matchService.updateStatus.mockRejectedValue(new Error('Sin permisos'));
    renderPage();
    await esperarCarga();

    await user.click(screen.getAllByRole('button', { name: /comenzar/i })[0]);
    await user.click(botonDelModal(/^comenzar$/i));

    await waitFor(() => expect(matchService.updateStatus).toHaveBeenCalled());
  });
  
  it('abre el partido en vivo en vez de pedir el resultado tipeado', async () => {
    const user = userEvent.setup();
    renderPage();
    await esperarCarga();

    await user.click(screen.getAllByRole('button', { name: /abrir en vivo/i })[0]);

    expect(onNavigate).toHaveBeenCalledWith('match-live/3');
    expect(matchService.updateResult).not.toHaveBeenCalled();
  });

  it('envia cada partido a su propia pantalla en vivo', async () => {
    const user = userEvent.setup();
    renderPage();
    await esperarCarga();

    const botones = screen.getAllByRole('button', { name: /abrir en vivo/i });
    await user.click(botones[0]);
    await user.click(botones[1]);

    expect(onNavigate).toHaveBeenNthCalledWith(1, 'match-live/3');
    expect(onNavigate).toHaveBeenNthCalledWith(2, 'match-live/6');
  });

  it('no pide un resultado al partido: el reloj no arranco todavia', async () => {
    matchService.getMine.mockResolvedValue({ data: [PARTIDOS[0]] });
    renderPage();
    await esperarCarga();

    expect(screen.getByRole('button', { name: /comenzar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /abrir en vivo/i })).not.toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('finaliza un partido mostrando el resultado registrado', async () => {
    const user = userEvent.setup();
    renderPage();
    await esperarCarga();

    await user.click(screen.getAllByRole('button', { name: /^finalizar$/i })[0]);

    expect(await screen.findByText(/registrar la finalización/i)).toBeInTheDocument();
    expect(screen.getByText(/Resultado: 2 - 1/)).toBeInTheDocument();

    await user.click(botonDelModal(/^finalizar$/i));

    await waitFor(() =>
      expect(matchService.updateStatus).toHaveBeenCalledWith(3, { estado: 'Finalizado' })
    );
    expect(await screen.findByText('Partido finalizado')).toBeInTheDocument();
  });

  it('avisa que el partido todavia no tiene resultado cargado', async () => {
    const user = userEvent.setup();
    matchService.getMine.mockResolvedValue({ data: [PARTIDOS[5]] });
    renderPage();
    await esperarCarga();

    await user.click(screen.getByRole('button', { name: /^finalizar$/i }));

    expect(await screen.findByText(/Aún no se cargó el resultado/)).toBeInTheDocument();
    expect(screen.getByText(/registrar la finalización/i)).toBeInTheDocument();
  });

  it('cierra los modales sin tocar el partido', async () => {
    const user = userEvent.setup();
    renderPage();
    await esperarCarga();

    await user.click(screen.getAllByRole('button', { name: /comenzar/i })[0]);
    await user.click(botonDelModal('Cancelar'));
    expect(screen.queryByText(/Dar inicio al partido/)).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /^finalizar$/i })[0]);
    await user.click(botonDelModal('Cancelar'));
    expect(screen.queryByRole('heading', { name: 'Finalizar partido' })).not.toBeInTheDocument();

    expect(matchService.updateStatus).not.toHaveBeenCalled();
    expect(matchService.updateResult).not.toHaveBeenCalled();
  });

  it('cierra la notificacion a mano', async () => {
    const user = userEvent.setup();
    renderPage();
    await esperarCarga();

    await user.click(screen.getAllByRole('button', { name: /comenzar/i })[0]);
    await user.click(await screen.findByRole('heading', { name: 'Comenzar partido' }));
    await user.click(botonDelModal(/^comenzar$/i));
    const notif = await screen.findByText('Partido iniciado');

    await user.click(notif);

    await waitFor(() => expect(screen.queryByText('Partido iniciado')).not.toBeInTheDocument());
  });

  it('no rompe cuando las listas de filtros vienen vacias o con otra forma', async () => {
    disciplineService.getAll.mockResolvedValue({});
    tournamentService.getAll.mockResolvedValue(null);
    matchService.getMine.mockResolvedValue(null);

    renderPage();

    expect(await screen.findByText('No hay partidos para los filtros seleccionados')).toBeInTheDocument();
    expect(within(screen.getByDisplayValue('Todos los deportes')).getAllByRole('option')).toHaveLength(1);
  });

  it('registra el error si no se pueden cargar los partidos', async () => {
    matchService.getMine.mockRejectedValue(new Error('Fallo de red'));
    renderPage();

    expect(await screen.findByText('No hay partidos para los filtros seleccionados')).toBeInTheDocument();
    expect(console.error).toHaveBeenCalledWith('Error loading my matches:', expect.any(Error));
  });

  it('registra el error si no se pueden cargar los filtros', async () => {
    disciplineService.getAll.mockRejectedValue(new Error('Fallo'));
    tournamentService.getAll.mockRejectedValue(new Error('Fallo'));

    renderPage();
    await esperarCarga();

    expect(console.error).toHaveBeenCalledWith('Error loading disciplines:', expect.any(Error));
    expect(console.error).toHaveBeenCalledWith('Error loading tournaments:', expect.any(Error));
  });
});
