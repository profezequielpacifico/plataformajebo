import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { MisPartidosPage } from '../../../src/pages/matches/MisPartidosPage.js';
import matchService from '../../../src/services/matchService.js';
import tournamentService from '../../../src/services/tournamentService.js';
import regionService from '../../../src/services/regionService.js';
import teamService from '../../../src/services/teamService.js';

vi.mock('../../../src/services/matchService.js', () => ({
  default: { getMine: vi.fn(), updateStatus: vi.fn(), updateResult: vi.fn() }
}));
vi.mock('../../../src/services/tournamentService.js', () => ({
  default: { getAll: vi.fn() }
}));
vi.mock('../../../src/services/regionService.js', () => ({
  default: { getAll: vi.fn() }
}));
vi.mock('../../../src/services/teamService.js', () => ({
  default: { getEnrolled: vi.fn() }
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

const TORNEOS = {
  data: [
    { id_torneo: 1, nombre: 'Torneo Otoño', id_disciplina: 1, disciplina_nombre: 'Fútbol 5', estado: 'En Progreso' },
    { id_torneo: 2, nombre: 'Copa Primavera', idDisciplina: 2, disciplina_nombre: 'Vóley' },
    { id_torneo: 3, nombre: 'Copa Cerrada', id_disciplina: 3, disciplina_nombre: 'Básquet', estado: 'Finalizado' }
  ]
};
const REGIONES = { data: [{ id_region: 1, nombre: 'Región I' }, { id_region: 2, nombre: 'Región II' }] };
const INSCRIPTOS = {
  data: [
    { id_equipo: 10, equipo_nombre: 'Leones', id_region: 1 },
    { id_equipo: 11, equipo_nombre: 'Tigres', id_region: 1 }
  ]
};

describe('MisPartidosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    matchService.getMine.mockResolvedValue({ data: PARTIDOS });
    matchService.updateStatus.mockResolvedValue({});
    matchService.updateResult.mockResolvedValue({});
    tournamentService.getAll.mockResolvedValue(TORNEOS);
    regionService.getAll.mockResolvedValue(REGIONES);
    teamService.getEnrolled.mockResolvedValue(INSCRIPTOS);
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

    expect(screen.getByText('Todos los partidos con filtros por región, torneo, equipos y estado')).toBeInTheDocument();
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

  it('muestra los mismos filtros que la lista de partidos y ninguno mas', async () => {
    renderPage();
    await esperarCarga();

    const nombres = screen.getAllByRole('combobox').map(c => c.getAttribute('aria-label'));
    expect(nombres).toEqual(['Región', 'Torneo', 'Equipo A', 'Equipo B', 'Estado']);
    expect(screen.queryByDisplayValue('Todos los deportes')).not.toBeInTheDocument();
  });

  it('filtra por region, torneo, equipos y estado', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('option', { name: 'Región II' });
    await screen.findByRole('option', { name: /Torneo Otoño/ });

    await user.selectOptions(screen.getByLabelText('Región'), '1');
    await user.selectOptions(screen.getByLabelText('Torneo'), '1');
    await waitFor(() =>
      expect(teamService.getEnrolled).toHaveBeenCalledWith({
        id_torneo: '1', limit: 100, include_cerradas: 'true', id_region: '1'
      })
    );
    await within(screen.getByLabelText('Equipo A')).findByRole('option', { name: 'Leones' });
    await user.selectOptions(screen.getByLabelText('Equipo A'), '10');
    await user.selectOptions(screen.getByLabelText('Equipo B'), '11');
    await user.selectOptions(screen.getByLabelText('Estado'), 'Pendiente');

    await waitFor(() =>
      expect(matchService.getMine).toHaveBeenLastCalledWith({
        limit: 100,
        id_region: '1',
        id_torneo: '1',
        id_equipo: '10',
        id_equipo_rival: '11',
        estado: 'Pendiente'
      })
    );
  });

  it('solo ofrece los torneos activos', async () => {
    renderPage();
    await screen.findByRole('option', { name: /Torneo Otoño/ });
    const labels = within(screen.getByLabelText('Torneo')).getAllByRole('option').map(o => o.textContent);

    expect(labels.some(l => l.includes('Copa Primavera'))).toBe(true);
    expect(labels.some(l => l.includes('Copa Cerrada'))).toBe(false);
  });

  it('deshabilita los equipos hasta elegir un torneo', async () => {
    renderPage();
    await esperarCarga();

    expect(screen.getByLabelText('Equipo A')).toBeDisabled();
    expect(screen.getByLabelText('Equipo B')).toBeDisabled();
    expect(teamService.getEnrolled).not.toHaveBeenCalled();
  });

  it('limpia los equipos al cambiar de torneo', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('option', { name: /Torneo Otoño/ });
    await user.selectOptions(screen.getByLabelText('Torneo'), '1');
    await within(screen.getByLabelText('Equipo A')).findByRole('option', { name: 'Leones' });
    await user.selectOptions(screen.getByLabelText('Equipo A'), '10');
    await user.selectOptions(screen.getByLabelText('Torneo'), '2');

    expect(screen.getByLabelText('Equipo A')).toHaveValue('');
    await waitFor(() =>
      expect(matchService.getMine).toHaveBeenLastCalledWith({ limit: 100, id_torneo: '2' })
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
    regionService.getAll.mockResolvedValue({});
    tournamentService.getAll.mockResolvedValue(null);
    matchService.getMine.mockResolvedValue(null);

    renderPage();

    expect(await screen.findByText('No hay partidos para los filtros seleccionados')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Región')).getAllByRole('option')).toHaveLength(1);
    expect(within(screen.getByLabelText('Torneo')).getAllByRole('option')).toHaveLength(1);
  });

  it('registra el error si no se pueden cargar los partidos', async () => {
    matchService.getMine.mockRejectedValue(new Error('Fallo de red'));
    renderPage();

    expect(await screen.findByText('No hay partidos para los filtros seleccionados')).toBeInTheDocument();
    expect(console.error).toHaveBeenCalledWith('Error loading my matches:', expect.any(Error));
  });

  it('registra el error si no se pueden cargar los filtros', async () => {
    regionService.getAll.mockRejectedValue(new Error('Fallo regiones'));
    tournamentService.getAll.mockRejectedValue(new Error('Fallo torneos'));

    renderPage();
    await esperarCarga();

    await waitFor(() => expect(console.error).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
