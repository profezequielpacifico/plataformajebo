import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { MatchFormPage } from '../../../src/pages/matches/MatchFormPage.js';
import matchService from '../../../src/services/matchService.js';
import tournamentService from '../../../src/services/tournamentService.js';
import teamService from '../../../src/services/teamService.js';
import courtService from '../../../src/services/courtService.js';
import userService from '../../../src/services/userService.js';

vi.mock('../../../src/services/matchService.js', () => ({
  default: { getById: vi.fn(), create: vi.fn(), update: vi.fn() }
}));
vi.mock('../../../src/services/tournamentService.js', () => ({
  default: { getAll: vi.fn() }
}));
vi.mock('../../../src/services/teamService.js', () => ({
  default: { getEnrolled: vi.fn() }
}));
vi.mock('../../../src/services/courtService.js', () => ({
  default: { getAll: vi.fn(), getAvailability: vi.fn() }
}));
vi.mock('../../../src/services/userService.js', () => ({
  default: { getAll: vi.fn() }
}));

const TORNEOS = {
  data: [
    { id_torneo: 1, nombre: 'Torneo Otoño', id_disciplina: 1, disciplina_nombre: 'Fútbol 5' },
    { id_torneo: 2, nombre: 'Copa Libre', disciplina_nombre: 'Vóley' }
  ]
};

const CANCHAS = {
  data: [
    { id_cancha: 10, nombre: 'Cancha 1', id_disciplina: 1, disciplina_nombre: 'Fútbol 5', link_maps: 'https://maps.google.com/cancha1' },
    { id_cancha: 20, nombre: 'Cancha 2', id_disciplina: 2, disciplina_nombre: 'Vóley' }
  ]
};

const HORARIOS = {
  data: [
    { id_horario_cancha: 1, hora_inicio: '18:00', hora_fin: '19:30' },
    { id_horario_cancha: 2, hora_inicio: '20:00' }
  ]
};

const EQUIPOS = {
  data: [
    { id_equipo: 100, equipo_nombre: 'Local FC', colores: 'rojo' },
    { id_equipo: 200, nombre: 'Visitante FC' }
  ]
};

const ARBITROS = { data: [{ id_usuario: 7, nombre: 'Ana' }, { id_usuario: 8, name: 'Luis' }] };

const PARTIDO = {
  id_partido: 55,
  id_torneo: 1,
  id_cancha: 10,
  id_equipo_local: 100,
  id_equipo_visitante: 200,
  fecha: '2026-10-05T00:00:00.000Z',
  hora: '18:00',
  arbitros: [{ id: 7 }, { id_usuario: 8 }]
};

describe('MatchFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    matchService.getById.mockResolvedValue({ data: PARTIDO });
    matchService.create.mockResolvedValue({ id_partido: 1 });
    matchService.update.mockResolvedValue({});
    tournamentService.getAll.mockResolvedValue(TORNEOS);
    teamService.getEnrolled.mockResolvedValue(EQUIPOS);
    courtService.getAll.mockResolvedValue(CANCHAS);
    courtService.getAvailability.mockResolvedValue(HORARIOS);
    userService.getAll.mockResolvedValue(ARBITROS);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  const renderPage = (props = {}) => {
    const utils = render(<MatchFormPage onNavigate={vi.fn()} {...props} />);
    return utils;
  };

  const selects = () => screen.getAllByRole('combobox');

  const elegirTorneo = async (user, value = '1') => {
    await user.selectOptions(selects()[0], value);
  };

  const esperarTorneo = () => waitFor(() => expect(teamService.getEnrolled).toHaveBeenCalled());

  const esperarTorneos = () =>
    waitFor(() =>
      expect(within(selects()[0]).getAllByRole('option').length).toBeGreaterThan(1)
    );

  const completarFormulario = async (user) => {
    await elegirTorneo(user);
    await esperarTorneo();
    await waitFor(() => expect(selects()[1]).toHaveDisplayValue('Seleccione cancha'));
    await user.selectOptions(selects()[1], '10');
    await user.type(screen.getByDisplayValue(''), '2026-10-05');
    await waitFor(() => expect(selects()[2]).toHaveDisplayValue('Seleccione horario'));
    await user.selectOptions(selects()[2], '18:00');
    await user.selectOptions(selects()[3], '100');
    await user.selectOptions(selects()[4], '200');
  };

  it('carga torneos, canchas y árbitros al abrir', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByRole('option', { name: /Torneo Otoño/ })).toBeInTheDocument());
    expect(tournamentService.getAll).toHaveBeenCalledWith(1, 100);
    expect(courtService.getAll).toHaveBeenCalled();
    expect(userService.getAll).toHaveBeenCalledWith({ rol: 'Arbitro' });
  });

  it('avisa si no se pudieron cargar las canchas ni los árbitros', async () => {
    courtService.getAll.mockRejectedValue(new Error('Fallo'));
    renderPage();

    await waitFor(() => expect(console.error).toHaveBeenCalledWith('Error loading data:', expect.any(Error)));
  });

  it('avisa si no se pudieron cargar los torneos', async () => {
    tournamentService.getAll.mockRejectedValue(new Error('Fallo'));
    renderPage();

    await waitFor(() => expect(console.error).toHaveBeenCalledWith(expect.any(Error)));
  });

  it('no pide equipos ni canchas hasta que se elige un torneo', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: /Torneo Otoño/ })).toBeInTheDocument());

    expect(teamService.getEnrolled).not.toHaveBeenCalled();
    expect(screen.getAllByText('Primero seleccione un torneo').length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('Primero seleccione cancha y fecha')).toBeDisabled();
  });

  it('filtra las canchas por la disciplina del torneo', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: /Torneo Otoño/ })).toBeInTheDocument());

    await elegirTorneo(user);

    await waitFor(() => expect(selects()[1]).toHaveDisplayValue('Seleccione cancha'));
    const cancha = within(selects()[1]);
    expect(cancha.getByRole('option', { name: /Cancha 1/ })).toBeInTheDocument();
    expect(cancha.queryByRole('option', { name: /Cancha 2/ })).not.toBeInTheDocument();
  });

  it('ofrece todas las canchas si el torneo no trae disciplina', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: /Torneo Otoño/ })).toBeInTheDocument());

    await elegirTorneo(user, '2');

    await waitFor(() => expect(selects()[1]).toHaveDisplayValue('Seleccione cancha'));
    expect(within(selects()[1]).getByRole('option', { name: /Cancha 2/ })).toBeInTheDocument();
  });

  it('avisa cuando el torneo no tiene canchas de su disciplina', async () => {
    const user = userEvent.setup();
    courtService.getAll.mockResolvedValue({ data: [] });
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: /Torneo Otoño/ })).toBeInTheDocument());

    await elegirTorneo(user);

    await waitFor(() => expect(selects()[1]).toHaveDisplayValue('No hay canchas para esta disciplina'));
  });

  it('limpia la cancha si deja de estar en la disciplina del torneo', async () => {
    const user = userEvent.setup();
    renderPage({ matchId: 55 });
    await waitFor(() => expect(selects()[1]).toHaveDisplayValue('Cancha 1 (Fútbol 5)'));

    await elegirTorneo(user, '2');

    await waitFor(() => expect(selects()[1]).toHaveValue(''));
  });

  it('muestra el enlace al mapa de la cancha elegida', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: /Torneo Otoño/ })).toBeInTheDocument());
    await elegirTorneo(user);
    await waitFor(() => expect(selects()[1]).toHaveDisplayValue('Seleccione cancha'));

    await user.selectOptions(selects()[1], '10');

    const enlace = await screen.findByRole('link', { name: /ver en google maps/i });
    expect(enlace).toHaveAttribute('href', 'https://maps.google.com/cancha1');
    expect(enlace).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('trae los equipos inscriptos al torneo', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: /Torneo Otoño/ })).toBeInTheDocument());

    await elegirTorneo(user);
    await esperarTorneo();

    expect(teamService.getEnrolled).toHaveBeenCalledWith({ id_torneo: '1', id_disciplina: '1', limit: 100, include_cerradas: 'true' });
    await waitFor(() => expect(selects()[3]).toHaveDisplayValue('Seleccione equipo'));
    expect(within(selects()[3]).getByRole('option', { name: 'Local FC' })).toBeInTheDocument();
  });

  it('avisa si el torneo no tiene equipos inscriptos', async () => {
    const user = userEvent.setup();
    teamService.getEnrolled.mockResolvedValue({ data: [] });
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: /Torneo Otoño/ })).toBeInTheDocument());

    await elegirTorneo(user);

    await waitFor(() => expect(selects()[3]).toHaveDisplayValue('No hay equipos inscriptos'));
  });

  it('avisa si no se pudieron cargar los equipos', async () => {
    const user = userEvent.setup();
    teamService.getEnrolled.mockRejectedValue(new Error('Fallo'));
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: /Torneo Otoño/ })).toBeInTheDocument());

    await elegirTorneo(user);

    await waitFor(() => expect(console.error).toHaveBeenCalledWith('Error loading enrolled teams:', expect.any(Error)));
    await waitFor(() => expect(selects()[3]).toHaveDisplayValue('No hay equipos inscriptos'));
  });

  it('no ofrece como visitante el equipo ya elegido como local', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: /Torneo Otoño/ })).toBeInTheDocument());
    await elegirTorneo(user);
    await esperarTorneo();
    await waitFor(() => expect(selects()[3]).toHaveDisplayValue('Seleccione equipo'));

    await user.selectOptions(selects()[3], '100');

    const visitante = within(selects()[4]);
    expect(visitante.queryByRole('option', { name: 'Local FC' })).not.toBeInTheDocument();
    expect(visitante.getByRole('option', { name: 'Visitante FC' })).toBeInTheDocument();
  });

  it('carga los horarios disponibles de la cancha y la fecha', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: /Torneo Otoño/ })).toBeInTheDocument());
    await elegirTorneo(user);
    await waitFor(() => expect(selects()[1]).toHaveDisplayValue('Seleccione cancha'));
    await user.selectOptions(selects()[1], '10');
    await user.type(screen.getByDisplayValue(''), '2026-10-05');

    await waitFor(() => expect(courtService.getAvailability).toHaveBeenCalledWith('10', '2026-10-05'));
    await waitFor(() => expect(selects()[2]).toHaveDisplayValue('Seleccione horario'));
    expect(within(selects()[2]).getByRole('option', { name: '18:00 - 19:30' })).toBeInTheDocument();
  });

  it('deja los horarios vacios si no hay cancha o fecha', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: /Torneo Otoño/ })).toBeInTheDocument());

    expect(courtService.getAvailability).not.toHaveBeenCalled();
    expect(selects()[2]).toBeDisabled();
  });

  it('avisa si no se pudieron cargar los horarios', async () => {
    const user = userEvent.setup();
    courtService.getAvailability.mockRejectedValue(new Error('Fallo'));
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: /Torneo Otoño/ })).toBeInTheDocument());
    await elegirTorneo(user);
    await waitFor(() => expect(selects()[1]).toHaveDisplayValue('Seleccione cancha'));
    await user.selectOptions(selects()[1], '10');
    await user.type(screen.getByDisplayValue(''), '2026-10-05');

    await waitFor(() => expect(console.error).toHaveBeenCalledWith('Error loading slots:', expect.any(Error)));
  });

  it('muestra el deporte del torneo elegido', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: /Torneo Otoño/ })).toBeInTheDocument());

    expect(screen.queryByText(/Deporte seleccionado/)).not.toBeInTheDocument();

    await elegirTorneo(user);

    expect(await screen.findByText('Deporte seleccionado:')).toBeInTheDocument();
    expect(screen.getByText('Fútbol 5')).toBeInTheDocument();
  });

  it('autorellena el textbox de disciplina con la del torneo elegido', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: /Torneo Otoño/ })).toBeInTheDocument());

    expect(screen.getByPlaceholderText('Se completa con el torneo elegido')).toHaveValue('');

    await elegirTorneo(user);

    expect(screen.getByPlaceholderText('Se completa con el torneo elegido')).toHaveValue('Fútbol 5');

    await elegirTorneo(user, '2');
    expect(screen.getByPlaceholderText('Se completa con el torneo elegido')).toHaveValue('Vóley');
  });

  it('no filtra por disciplina si el torneo no trae id_disciplina', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: /Torneo Otoño/ })).toBeInTheDocument());

    await elegirTorneo(user, '2');
    await esperarTorneo();

    expect(teamService.getEnrolled).toHaveBeenCalledWith({ id_torneo: '2', limit: 100, include_cerradas: 'true' });
  });

  it('carga el partido existente con sus datos', async () => {
    renderPage({ matchId: 55 });

    expect(await screen.findByText('Editar Partido')).toBeInTheDocument();
    expect(matchService.getById).toHaveBeenCalledWith(55);
    expect(selects()[0]).toHaveValue('1');
    await waitFor(() => expect(selects()[1]).toHaveValue('10'));
    await waitFor(() => expect(selects()[3]).toHaveValue('100'));
    await waitFor(() => expect(selects()[4]).toHaveValue('200'));
    expect(screen.getByDisplayValue('2026-10-05')).toBeInTheDocument();
    await waitFor(() => expect(selects()[2]).toHaveValue('18:00'));
  });

  it('marca los árbitros que ya estaban asignados', async () => {
    renderPage({ matchId: 55 });

    const [ana, luis] = await screen.findAllByRole('checkbox');
    await waitFor(() => expect(ana).toBeChecked());
    expect(luis).toBeChecked();
  });

  it('agrega y saca árbitros de la lista', async () => {
    const user = userEvent.setup();
    renderPage();

    const [ana] = await screen.findAllByRole('checkbox');
    await user.click(ana);
    expect(ana).toBeChecked();

    await user.click(ana);
    expect(ana).not.toBeChecked();
  });

  it('avisa cuando no hay árbitros registrados', async () => {
    userService.getAll.mockResolvedValue({ data: [] });
    renderPage();

    expect(await screen.findByText('No hay árbitros registrados')).toBeInTheDocument();
  });

  it('crea un partido sin árbitros', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    renderPage({ onNavigate });
    await waitFor(() => expect(screen.getByRole('option', { name: /Torneo Otoño/ })).toBeInTheDocument());
    await completarFormulario(user);

    await user.click(screen.getByRole('button', { name: /guardar partido/i }));

    expect(await screen.findByText('¡Partido guardado!')).toBeInTheDocument();
    expect(matchService.create).toHaveBeenCalledWith({
      id_torneo: '1',
      id_equipo_local: '100',
      id_equipo_visitante: '200',
      fecha: '2026-10-05',
      hora: '18:00',
      id_cancha: '10'
    });
  });

  it('actualiza el partido con sus árbitros', async () => {
    const user = userEvent.setup();
    renderPage({ matchId: 55 });
    await waitFor(() => expect(selects()[0]).toHaveValue('1'));

    await user.click(screen.getByRole('button', { name: /actualizar partido/i }));

    expect(await screen.findByText('¡Partido actualizado!')).toBeInTheDocument();
    expect(matchService.update).toHaveBeenCalledWith(55, expect.objectContaining({
      id_torneo: '1',
      arbitros: [7, 8]
    }));
  });

  it('vuelve al listado desde la pantalla de exito', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    renderPage({ matchId: 55, onNavigate });
    await waitFor(() => expect(selects()[0]).toHaveValue('1'));

    await user.click(screen.getByRole('button', { name: /actualizar partido/i }));
    await screen.findByText('El partido ha sido actualizado exitosamente');
    await user.click(screen.getByRole('button', { name: 'Volver' }));

    expect(onNavigate).toHaveBeenCalledWith('matches');
  });

  it('avisa con un alert si el guardado falla', async () => {
    const user = userEvent.setup();
    matchService.create.mockRejectedValue(new Error('Cancha ocupada'));
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: /Torneo Otoño/ })).toBeInTheDocument());
    await completarFormulario(user);

    await user.click(screen.getByRole('button', { name: /guardar partido/i }));

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Error al guardar: Cancha ocupada'));
    expect(screen.queryByText('¡Partido guardado!')).not.toBeInTheDocument();
  });

  it('avisa si el partido no se pudo cargar', async () => {
    matchService.getById.mockRejectedValue(new Error('Fallo'));
    renderPage({ matchId: 55 });

    await waitFor(() => expect(console.error).toHaveBeenCalledWith('Error loading match:', expect.any(Error)));
  });

  it('ignora la carga cuando no hay partido que editar', async () => {
    renderPage();

    expect(screen.getByText('Nuevo Partido')).toBeInTheDocument();
    expect(matchService.getById).not.toHaveBeenCalled();
  });

  it('cancela sin guardar', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    renderPage({ onNavigate });
    await waitFor(() => expect(screen.getByRole('option', { name: /Torneo Otoño/ })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(onNavigate).toHaveBeenCalledWith('matches');
    expect(matchService.create).not.toHaveBeenCalled();
  });

  it('en solo lectura no ofrece guardar y deshabilita los campos', async () => {
    renderPage({ matchId: 55, readOnly: true });
    await waitFor(() => expect(screen.getByText('Detalle del Partido')).toBeInTheDocument());

    expect(screen.queryByRole('button', { name: /guardar partido/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /actualizar partido/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
    expect(selects()[0]).toBeDisabled();
    expect(screen.getByDisplayValue('2026-10-05')).toBeDisabled();
    for (const arbitro of await screen.findAllByRole('checkbox')) {
      expect(arbitro).toBeDisabled();
    }
  });

  describe('torneos de tipo EVALUACION (Gimnasia)', () => {
    const CON_GIMNASIA = {
      data: [
        ...TORNEOS.data,
        {
          id_torneo: 32,
          nombre: 'Torneo Gimnasia JEBO 2026',
          disciplina_nombre: 'Gimnasia Artística',
          tipo_competencia: 'EVALUACION'
        }
      ]
    };

    it('no ofrece el torneo de Gimnasia en el selector', async () => {
      tournamentService.getAll.mockResolvedValue(CON_GIMNASIA);
      renderPage();

      await esperarTorneos();

      const opciones = within(selects()[0]).getAllByRole('option').map(o => o.textContent);
      expect(opciones.some(o => o.includes('Gimnasia'))).toBe(false);
    });

    it('deja los torneos que se juegan con marcador', async () => {
      tournamentService.getAll.mockResolvedValue(CON_GIMNASIA);
      renderPage();

      await esperarTorneos();

      const opciones = within(selects()[0]).getAllByRole('option').map(o => o.textContent);
      expect(opciones.some(o => o.includes('Torneo Otoño'))).toBe(true);
      expect(opciones.some(o => o.includes('Copa Libre'))).toBe(true);
    });
  });
});
